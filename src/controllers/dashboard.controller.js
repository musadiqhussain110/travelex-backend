import Lead from "../models/Lead.model.js";
import ContactInquiry from "../models/ContactInquiry.model.js";
import UmrahPackage from "../models/UmrahPackage.model.js";
import Tour from "../models/Tour.model.js";
import VisaService from "../models/VisaService.model.js";
import Blog from "../models/Blog.model.js";
import Faq from "../models/Faq.model.js";
import Notification from "../models/Notification.model.js";

import { asyncHandler } from "../utils/asyncHandler.js";

const formatStats = (items) => {
  return items.reduce((acc, item) => {
    acc[item._id || "Unknown"] = item.count;
    return acc;
  }, {});
};

const getStartDate = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(0, 0, 0, 0);
  return date;
};

const getTodayStart = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const getStatusCounts = async (Model, match = {}) => {
  const result = await Model.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 }
      }
    }
  ]);

  return formatStats(result);
};

const getDateTrend = async (Model, match = {}, startDate) => {
  return Model.aggregate([
    {
      $match: {
        ...match,
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$createdAt"
          }
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: {
        _id: 1
      }
    }
  ]);
};

const addNotificationReadStatus = (notifications, adminId) => {
  return notifications.map((notification) => {
    const isRead = notification.readBy.some(
      (item) => item.admin.toString() === adminId.toString()
    );

    return {
      ...notification,
      isRead
    };
  });
};

export const getDashboardOverview = asyncHandler(async (req, res) => {
  const { days } = req.validated.query;

  const startDate = getStartDate(days);
  const todayStart = getTodayStart();

  const [
    totalLeads,
    newLeads,
    todayLeads,
    totalContactInquiries,
    newContactInquiries,
    todayContactInquiries,
    unreadNotifications,

    leadStatusStats,
    leadServiceStats,
    contactStatusStats,

    leadTrend,
    contactInquiryTrend,

    umrahPackageStats,
    tourStats,
    visaServiceStats,
    blogStats,
    faqStats,

    recentLeads,
    recentContactInquiries,
    recentNotifications
  ] = await Promise.all([
    Lead.countDocuments({ isArchived: false }),

    Lead.countDocuments({
      isArchived: false,
      status: "New"
    }),

    Lead.countDocuments({
      isArchived: false,
      createdAt: { $gte: todayStart }
    }),

    ContactInquiry.countDocuments({ isArchived: false }),

    ContactInquiry.countDocuments({
      isArchived: false,
      status: "New"
    }),

    ContactInquiry.countDocuments({
      isArchived: false,
      createdAt: { $gte: todayStart }
    }),

    Notification.countDocuments({
      isArchived: false,
      "readBy.admin": { $ne: req.admin._id }
    }),

    Lead.aggregate([
      { $match: { isArchived: false } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]),

    Lead.aggregate([
      { $match: { isArchived: false } },
      {
        $group: {
          _id: "$serviceType",
          count: { $sum: 1 }
        }
      }
    ]),

    ContactInquiry.aggregate([
      { $match: { isArchived: false } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]),

    getDateTrend(Lead, { isArchived: false }, startDate),

    getDateTrend(ContactInquiry, { isArchived: false }, startDate),

    getStatusCounts(UmrahPackage),

    getStatusCounts(Tour),

    getStatusCounts(VisaService),

    getStatusCounts(Blog),

    getStatusCounts(Faq),

    Lead.find({ isArchived: false })
      .sort("-createdAt")
      .limit(5)
      .select("name email phone serviceType status createdAt")
      .lean(),

    ContactInquiry.find({ isArchived: false })
      .sort("-createdAt")
      .limit(5)
      .select("name email phone subject status createdAt")
      .lean(),

    Notification.find({ isArchived: false })
      .sort("-createdAt")
      .limit(5)
      .select("title message type priority relatedModel relatedId actionUrl readBy createdAt")
      .lean()
  ]);

  res.status(200).json({
    success: true,
    dashboard: {
      range: {
        days,
        from: startDate,
        to: new Date()
      },

      cards: {
        totalLeads,
        newLeads,
        todayLeads,

        totalContactInquiries,
        newContactInquiries,
        todayContactInquiries,

        unreadNotifications
      },

      crm: {
        leadsByStatus: formatStats(leadStatusStats),
        leadsByServiceType: formatStats(leadServiceStats),
        contactInquiriesByStatus: formatStats(contactStatusStats)
      },

      trends: {
        leads: leadTrend,
        contactInquiries: contactInquiryTrend
      },

      cms: {
        umrahPackages: umrahPackageStats,
        tours: tourStats,
        visaServices: visaServiceStats,
        blogs: blogStats,
        faqs: faqStats
      },

      recent: {
        leads: recentLeads,
        contactInquiries: recentContactInquiries,
        notifications: addNotificationReadStatus(
          recentNotifications,
          req.admin._id
        )
      }
    }
  });
});