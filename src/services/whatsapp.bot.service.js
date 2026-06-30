const normalizeText = (text = "") => {
  return String(text)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
}

const hasAnyKeyword = (text, keywords = []) => {
  return keywords.some((keyword) => text.includes(keyword))
}

export const detectWhatsappIntent = (message = "") => {
  const text = normalizeText(message)

  if (
    hasAnyKeyword(text, [
      "salam",
      "assalam",
      "hello",
      "hi",
      "hey",
      "aoa",
      "asalam",
      "السلام",
    ])
  ) {
    return "greeting"
  }

  if (
    hasAnyKeyword(text, [
      "umrah",
      "umra",
      "makkah",
      "madinah",
      "ziyarat",
      "haram",
      "kaaba",
    ])
  ) {
    return "umrah"
  }

  if (
    hasAnyKeyword(text, [
      "visa",
      "visit visa",
      "tourist visa",
      "student visa",
      "business visa",
      "documents",
      "passport",
      "embassy",
      "file",
    ])
  ) {
    return "visa"
  }

  if (
    hasAnyKeyword(text, [
      "tour",
      "trip",
      "package",
      "holiday",
      "honeymoon",
      "dubai",
      "turkey",
      "baku",
      "azerbaijan",
      "malaysia",
      "thailand",
      "qatar",
    ])
  ) {
    return "tour"
  }

  if (
    hasAnyKeyword(text, [
      "hotel",
      "room",
      "stay",
      "check in",
      "check-in",
      "check out",
      "check-out",
      "breakfast",
    ])
  ) {
    return "hotel"
  }

  if (
    hasAnyKeyword(text, [
      "car",
      "rental",
      "transport",
      "pickup",
      "drop",
      "airport transfer",
      "driver",
      "chauffeur",
      "vehicle",
    ])
  ) {
    return "carRental"
  }

  if (
    hasAnyKeyword(text, [
      "price",
      "rate",
      "cost",
      "charges",
      "budget",
      "fee",
      "kitna",
      "package price",
    ])
  ) {
    return "price"
  }

  if (
    hasAnyKeyword(text, [
      "address",
      "location",
      "office",
      "where",
      "map",
      "peshawar",
    ])
  ) {
    return "address"
  }

  if (
    hasAnyKeyword(text, [
      "agent",
      "consultant",
      "human",
      "call me",
      "contact me",
      "representative",
      "sir",
      "madam",
      "talk",
    ])
  ) {
    return "human_handoff"
  }

  if (hasAnyKeyword(text, ["thanks", "thank you", "jazak", "shukriya"])) {
    return "thanks"
  }

  return "general"
}

export const buildWhatsappAutoReply = ({ message = "", profileName = "" }) => {
  const intent = detectWhatsappIntent(message)

  const name = profileName ? ` ${profileName}` : ""

  const replies = {
    greeting: [
      `Walaikum Assalam${name}! Welcome to TravelEx.pk.`,
      "",
      "How can we help you today?",
      "",
      "Please reply with one option:",
      "1. Umrah Packages",
      "2. Visa Assistance",
      "3. International Tours",
      "4. Hotel Booking",
      "5. Car Rental / Airport Transfer",
      "6. Talk to Consultant",
    ].join("\n"),

    umrah: [
      "Thank you for your Umrah inquiry.",
      "",
      "Please share these details so our consultant can guide you:",
      "",
      "1. Departure city",
      "2. Travel month/date",
      "3. Number of travelers",
      "4. Hotel preference: Economy / Standard / Premium",
      "5. Required nights in Makkah and Madinah",
      "",
      "Our team will suggest the best available Umrah package.",
    ].join("\n"),

    visa: [
      "Thank you for your visa inquiry.",
      "",
      "Please share:",
      "",
      "1. Visa country",
      "2. Visa type: Tourist / Visit / Business / Student / Family",
      "3. Expected travel date",
      "4. Passport available? Yes/No",
      "5. Number of applicants",
      "",
      "TravelEx will guide you about documents and next steps.",
    ].join("\n"),

    tour: [
      "Thank you for your international tour inquiry.",
      "",
      "Please share:",
      "",
      "1. Destination country/city",
      "2. Travel month/date",
      "3. Number of travelers",
      "4. Budget range",
      "5. Hotel preference",
      "",
      "Our consultant will suggest a suitable tour plan.",
    ].join("\n"),

    hotel: [
      "Thank you for your hotel booking inquiry.",
      "",
      "Please share:",
      "",
      "1. City / hotel location",
      "2. Check-in date",
      "3. Check-out date",
      "4. Number of guests",
      "5. Number of rooms",
      "6. Budget or hotel category",
      "",
      "TravelEx will check availability and guide you.",
    ].join("\n"),

    carRental: [
      "Thank you for your car rental / transport inquiry.",
      "",
      "Please share:",
      "",
      "1. Country and city",
      "2. Pickup location",
      "3. Pickup date and time",
      "4. Drop-off location",
      "5. Number of passengers",
      "6. Self-drive or with driver?",
      "",
      "Our team will check availability and share a quote.",
    ].join("\n"),

    price: [
      "Prices depend on destination, dates, availability, hotel category, passengers and service type.",
      "",
      "Please share which service you need:",
      "",
      "1. Umrah",
      "2. Visa",
      "3. Tour",
      "4. Hotel",
      "5. Car Rental",
      "",
      "Then share your travel date and number of travelers so our team can guide you correctly.",
    ].join("\n"),

    address: [
      "TravelEx Air Services",
      "",
      "Address:",
      "Shakeel Plaza, Opposite Islamia College, University Road, Peshawar.",
      "",
      "Phone / WhatsApp:",
      "03 111 444 192",
    ].join("\n"),

    human_handoff: [
      "Sure, our consultant will assist you shortly.",
      "",
      "Please share your name, service required, and best time to contact you.",
    ].join("\n"),

    thanks: [
      "You're welcome!",
      "",
      "TravelEx.pk team is here to help you with Umrah, visa, tours, hotels and car rental support.",
    ].join("\n"),

    general: [
      "Thank you for contacting TravelEx.pk.",
      "",
      "Please tell us what you need help with:",
      "",
      "1. Umrah Packages",
      "2. Visa Assistance",
      "3. International Tours",
      "4. Hotel Booking",
      "5. Car Rental / Airport Transfer",
      "6. Talk to Consultant",
    ].join("\n"),
  }

  return {
    intent,
    reply: replies[intent] || replies.general,
    handoffRequired: intent === "human_handoff",
  }
}