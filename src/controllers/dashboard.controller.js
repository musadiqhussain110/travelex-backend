import Lead from "../models/Lead.model.js";
import ContactInquiry from "../models/ContactInquiry.model.js";
import UmrahPackage from "../models/UmrahPackage.model.js";
import Tour from "../models/Tour.model.js";
import VisaService from "../models/VisaService.model.js";
import Blog from "../models/Blog.model.js";
import Faq from "../models/Faq.model.js";
import Notification from "../models/Notification.model.js";

import { asyncHandler } from "../utils/asyncHandler.js";

const convertedStatuses = ["Confirmed", "Booked"];
const lostStatuses = ["Lost", "Cancelled"];

const serviceLabels = {
  umrah: "Umrah",
  tour: "Tours",
  visa: "Visa",
  ticket: "Air Tickets",
  hotel: "Hotels",
  carRental: "Airport Transfers",
  contact: "Contact",
  general: "General",
};

const formatStats = (items) => {
  return items.reduce((acc, item) => {
    acc[item._id || "Unknown"] = item.count;
    return acc;
  }, {});
};

const getStartDate = (days) => {
  const safeDays = Math.max(Number(days) || 30, 1);
  const date = new Date();

  date.setDate(date.getDate() - (safeDays - 1));
  date.setHours(0, 0, 0, 0);

  return date;
};

const getPreviousStartDate = (currentStartDate, days) => {
  const safeDays = Math.max(Number(days) || 30, 1);
  const date = new Date(currentStartDate);

  date.setDate(date.getDate() - safeDays);
  date.setHours(0, 0, 0, 0);

  return date;
};

const getTodayStart = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const getTomorrowStart = () => {
  const tomorrow = getTodayStart();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow;
};

const getDateKey = (date) => {
  return date.toISOString().slice(0, 10);
};

const getConversionRate = (converted, total) => {
  if (!total) return 0;
  return Number(((converted / total) * 100).toFixed(1));
};

const getPercentageChange = (current, previous) => {
  if (!previous && !current) return 0;
  if (!previous && current) return 100;

  return Number((((current - previous) / previous) * 100).toFixed(1));
};

const getDateBuckets = (startDate, days) => {
  const safeDays = Math.max(Number(days) || 30, 1);
  const buckets = [];

  for (let index = 0; index < safeDays; index += 1) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + index);

    buckets.push({
      date: getDateKey(date),
      totalLeads: 0,
      convertedLeads: 0,
      lostLeads: 0,
      noFollowUpLeads: 0,
      conversionRate: 0,
    });
  }

  return buckets;
};

const fillTimelineGaps = (timeline = [], startDate, days) => {
  const buckets = getDateBuckets(startDate, days);
  const map = new Map(timeline.map((item) => [item.date, item]));

  return buckets.map((bucket) => {
    const item = map.get(bucket.date) || bucket;

    return {
      ...bucket,
      ...item,
      conversionRate: getConversionRate(
        item.convertedLeads || 0,
        item.totalLeads || 0
      ),
    };
  });
};

const getStatusCounts = async (Model, match = {}) => {
  const result = await Model.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  return formatStats(result);
};

const getDateTrend = async (Model, match = {}, startDate) => {
  return Model.aggregate([
    {
      $match: {
        ...match,
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$createdAt",
          },
        },
        count: { $sum: 1 },
      },
    },
    {
      $sort: {
        _id: 1,
      },
    },
  ]);
};

const addNotificationReadStatus = (notifications, adminId) => {
  return notifications.map((notification) => {
    const isRead = notification.readBy.some(
      (item) => item.admin.toString() === adminId.toString()
    );

    return {
      ...notification,
      isRead,
    };
  });
};

const buildNoFollowUpMatch = (extraMatch = {}) => {
  return {
    ...extraMatch,
    $or: [
      { followUpDate: { $exists: false } },
      { followUpDate: null },
      { followUpStatus: { $exists: false } },
      { followUpStatus: null },
      { followUpStatus: "" },
      { followUpStatus: "Not Set" },
    ],
  };
};

const getBusinessSummary = async (match = {}, todayStart, tomorrowStart) => {
  const [
    totalLeads,
    convertedLeads,
    lostLeads,
    newLeads,
    contactedLeads,
    interestedLeads,
    noFollowUpLeads,
    scheduledFollowUps,
    overdueFollowUps,
    todayFollowUps,
  ] = await Promise.all([
    Lead.countDocuments(match),

    Lead.countDocuments({
      ...match,
      status: { $in: convertedStatuses },
    }),

    Lead.countDocuments({
      ...match,
      status: { $in: lostStatuses },
    }),

    Lead.countDocuments({
      ...match,
      status: "New",
    }),

    Lead.countDocuments({
      ...match,
      status: "Contacted",
    }),

    Lead.countDocuments({
      ...match,
      status: "Interested",
    }),

    Lead.countDocuments(buildNoFollowUpMatch(match)),

    Lead.countDocuments({
      ...match,
      followUpStatus: "Scheduled",
    }),

    Lead.countDocuments({
      ...match,
      followUpStatus: "Scheduled",
      followUpDate: { $lt: todayStart },
    }),

    Lead.countDocuments({
      ...match,
      followUpStatus: "Scheduled",
      followUpDate: {
        $gte: todayStart,
        $lt: tomorrowStart,
      },
    }),
  ]);

  return {
    totalLeads,
    convertedLeads,
    lostLeads,
    newLeads,
    contactedLeads,
    interestedLeads,
    noFollowUpLeads,
    scheduledFollowUps,
    overdueFollowUps,
    todayFollowUps,
    conversionRate: getConversionRate(convertedLeads, totalLeads),
    lostRate: getConversionRate(lostLeads, totalLeads),
    noFollowUpRate: getConversionRate(noFollowUpLeads, totalLeads),
  };
};

const getTimelineAggregation = async (match = {}) => {
  const result = await Lead.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$createdAt",
          },
        },
        totalLeads: { $sum: 1 },
        convertedLeads: {
          $sum: {
            $cond: [{ $in: ["$status", convertedStatuses] }, 1, 0],
          },
        },
        lostLeads: {
          $sum: {
            $cond: [{ $in: ["$status", lostStatuses] }, 1, 0],
          },
        },
        noFollowUpLeads: {
          $sum: {
            $cond: [
              {
                $or: [
                  { $eq: [{ $ifNull: ["$followUpDate", null] }, null] },
                  {
                    $in: [
                      { $ifNull: ["$followUpStatus", "Not Set"] },
                      ["Not Set", ""],
                    ],
                  },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return result.map((item) => ({
    date: item._id,
    totalLeads: item.totalLeads,
    convertedLeads: item.convertedLeads,
    lostLeads: item.lostLeads,
    noFollowUpLeads: item.noFollowUpLeads,
    conversionRate: getConversionRate(item.convertedLeads, item.totalLeads),
  }));
};

const getServicePerformance = async (match = {}, todayStart) => {
  const result = await Lead.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$serviceType",
        totalLeads: { $sum: 1 },
        convertedLeads: {
          $sum: {
            $cond: [{ $in: ["$status", convertedStatuses] }, 1, 0],
          },
        },
        lostLeads: {
          $sum: {
            $cond: [{ $in: ["$status", lostStatuses] }, 1, 0],
          },
        },
        newLeads: {
          $sum: {
            $cond: [{ $eq: ["$status", "New"] }, 1, 0],
          },
        },
        interestedLeads: {
          $sum: {
            $cond: [{ $eq: ["$status", "Interested"] }, 1, 0],
          },
        },
        scheduledFollowUps: {
          $sum: {
            $cond: [{ $eq: ["$followUpStatus", "Scheduled"] }, 1, 0],
          },
        },
        overdueFollowUps: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$followUpStatus", "Scheduled"] },
                  { $lt: ["$followUpDate", todayStart] },
                ],
              },
              1,
              0,
            ],
          },
        },
        noFollowUpLeads: {
          $sum: {
            $cond: [
              {
                $or: [
                  { $eq: [{ $ifNull: ["$followUpDate", null] }, null] },
                  {
                    $in: [
                      { $ifNull: ["$followUpStatus", "Not Set"] },
                      ["Not Set", ""],
                    ],
                  },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
    {
      $sort: {
        convertedLeads: -1,
        totalLeads: -1,
      },
    },
  ]);

  return result.map((item) => ({
    serviceType: item._id || "general",
    serviceLabel: serviceLabels[item._id] || item._id || "General",
    totalLeads: item.totalLeads,
    convertedLeads: item.convertedLeads,
    lostLeads: item.lostLeads,
    newLeads: item.newLeads,
    interestedLeads: item.interestedLeads,
    scheduledFollowUps: item.scheduledFollowUps,
    overdueFollowUps: item.overdueFollowUps,
    noFollowUpLeads: item.noFollowUpLeads,
    conversionRate: getConversionRate(item.convertedLeads, item.totalLeads),
    lostRate: getConversionRate(item.lostLeads, item.totalLeads),
    noFollowUpRate: getConversionRate(
      item.noFollowUpLeads,
      item.totalLeads
    ),
  }));
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
    recentNotifications,
  ] = await Promise.all([
    Lead.countDocuments({ isArchived: false }),

    Lead.countDocuments({
      isArchived: false,
      status: "New",
    }),

    Lead.countDocuments({
      isArchived: false,
      createdAt: { $gte: todayStart },
    }),

    ContactInquiry.countDocuments({ isArchived: false }),

    ContactInquiry.countDocuments({
      isArchived: false,
      status: "New",
    }),

    ContactInquiry.countDocuments({
      isArchived: false,
      createdAt: { $gte: todayStart },
    }),

    Notification.countDocuments({
      isArchived: false,
      "readBy.admin": { $ne: req.admin._id },
    }),

    Lead.aggregate([
      { $match: { isArchived: false } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]),

    Lead.aggregate([
      { $match: { isArchived: false } },
      {
        $group: {
          _id: "$serviceType",
          count: { $sum: 1 },
        },
      },
    ]),

    ContactInquiry.aggregate([
      { $match: { isArchived: false } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
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
      .select(
        "title message type priority relatedModel relatedId actionUrl readBy createdAt"
      )
      .lean(),
  ]);

  res.status(200).json({
    success: true,
    dashboard: {
      range: {
        days,
        from: startDate,
        to: new Date(),
      },

      cards: {
        totalLeads,
        newLeads,
        todayLeads,

        totalContactInquiries,
        newContactInquiries,
        todayContactInquiries,

        unreadNotifications,
      },

      crm: {
        leadsByStatus: formatStats(leadStatusStats),
        leadsByServiceType: formatStats(leadServiceStats),
        contactInquiriesByStatus: formatStats(contactStatusStats),
      },

      trends: {
        leads: leadTrend,
        contactInquiries: contactInquiryTrend,
      },

      cms: {
        umrahPackages: umrahPackageStats,
        tours: tourStats,
        visaServices: visaServiceStats,
        blogs: blogStats,
        faqs: faqStats,
      },

      recent: {
        leads: recentLeads,
        contactInquiries: recentContactInquiries,
        notifications: addNotificationReadStatus(
          recentNotifications,
          req.admin._id
        ),
      },
    },
  });
});

export const getBusinessInsights = asyncHandler(async (req, res) => {
  const days = Number(req.validated.query.days || 30);

  const currentStartDate = getStartDate(days);
  const previousStartDate = getPreviousStartDate(currentStartDate, days);
  const todayStart = getTodayStart();
  const tomorrowStart = getTomorrowStart();
  const now = new Date();

  const currentMatch = {
    isArchived: false,
    createdAt: {
      $gte: currentStartDate,
      $lte: now,
    },
  };

  const previousMatch = {
    isArchived: false,
    createdAt: {
      $gte: previousStartDate,
      $lt: currentStartDate,
    },
  };

  const [
    currentSummary,
    previousSummary,
    timelineRaw,
    servicePerformance,
    recentConvertedLeads,
    noFollowUpLeads,
    overdueFollowUps,
  ] = await Promise.all([
    getBusinessSummary(currentMatch, todayStart, tomorrowStart),

    getBusinessSummary(previousMatch, todayStart, tomorrowStart),

    getTimelineAggregation(currentMatch),

    getServicePerformance(currentMatch, todayStart),

    Lead.find({
      ...currentMatch,
      status: { $in: convertedStatuses },
    })
      .sort("-updatedAt")
      .limit(8)
      .select(
        "name phone email serviceType status priority createdAt updatedAt travelDate"
      )
      .lean(),

    Lead.find(buildNoFollowUpMatch(currentMatch))
      .sort("-createdAt")
      .limit(8)
      .select("name phone email serviceType status createdAt")
      .lean(),

    Lead.find({
      ...currentMatch,
      followUpStatus: "Scheduled",
      followUpDate: { $lt: todayStart },
    })
      .sort("followUpDate")
      .limit(8)
      .select(
        "name phone email serviceType status followUpDate followUpTime followUpNote createdAt"
      )
      .lean(),
  ]);

  const timeline = fillTimelineGaps(timelineRaw, currentStartDate, days);

  const bestServiceByConversions =
    servicePerformance.length > 0 ? servicePerformance[0] : null;

  const bestServiceByRate =
    servicePerformance
      .filter((item) => item.totalLeads > 0)
      .sort((a, b) => b.conversionRate - a.conversionRate)[0] || null;

  const weakestFollowUpService =
    servicePerformance
      .filter((item) => item.totalLeads > 0)
      .sort((a, b) => b.noFollowUpRate - a.noFollowUpRate)[0] || null;

  res.status(200).json({
    success: true,
    insights: {
      range: {
        days,
        from: currentStartDate,
        to: now,
        previousFrom: previousStartDate,
        previousTo: currentStartDate,
      },

      summary: currentSummary,

      comparison: {
        current: currentSummary,
        previous: previousSummary,
        changes: {
          totalLeadsChange: getPercentageChange(
            currentSummary.totalLeads,
            previousSummary.totalLeads
          ),
          convertedLeadsChange: getPercentageChange(
            currentSummary.convertedLeads,
            previousSummary.convertedLeads
          ),
          conversionRateChange: Number(
            (
              currentSummary.conversionRate - previousSummary.conversionRate
            ).toFixed(1)
          ),
          lostLeadsChange: getPercentageChange(
            currentSummary.lostLeads,
            previousSummary.lostLeads
          ),
          noFollowUpLeadsChange: getPercentageChange(
            currentSummary.noFollowUpLeads,
            previousSummary.noFollowUpLeads
          ),
        },
      },

      timeline,

      servicePerformance,

      highlights: {
        bestServiceByConversions,
        bestServiceByRate,
        weakestFollowUpService,
      },

      followUps: {
        noFollowUpCount: currentSummary.noFollowUpLeads,
        scheduledCount: currentSummary.scheduledFollowUps,
        overdueCount: currentSummary.overdueFollowUps,
        todayCount: currentSummary.todayFollowUps,
        noFollowUpLeads,
        overdueFollowUps,
      },

      recentConvertedLeads,
    },
  });
});