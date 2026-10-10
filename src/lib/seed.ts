// Seed data for the Kerala trip. Only details known from the trip spec are
// filled in; everything else is left blank and marked as pending / draft.
// Nothing here is a confirmed reservation.

import type {
  ActivityCategory,
  Booking,
  BookingCategory,
  Checklist,
  ChecklistItem,
  Contact,
  ItineraryActivity,
  Place,
  Trip,
  TripData,
} from "./types";

export const TRIP_ID = "trip_kerala_2026";

export const VERIFY_NOTE =
  "Opening hours, operating dates, prices and ticket availability must be verified with the official provider before travel.";

export const HOTEL_CHECKLIST = [
  "Dates and nights verified",
  "Correct room/guest count",
  "Breakfast confirmed",
  "Parking confirmed",
  "Check-in/check-out times confirmed",
  "Address and phone saved",
  "Cancellation policy checked",
  "Payment and balance recorded",
];

export const HOUSEBOAT_CHECKLIST = [
  "Operator and boat identity confirmed",
  "Boarding point and reporting time confirmed",
  "Private/shared boat confirmed",
  "Bedroom, AC hours, and attached bathroom confirmed",
  "Meals and drinking water confirmed",
  "Checkout time and cruise schedule confirmed",
  "Safety equipment/life jackets confirmed",
  "Total price, inclusions, and cancellation terms recorded",
];

export const CAB_INCLUSIONS = [
  "Tolls included",
  "Parking included",
  "Driver allowance / night charges included",
  "Fuel included",
  "GST included",
  "Waiting time terms agreed",
  "Sightseeing stops included",
  "Airport pickup included",
  "Airport drop included",
];

export const FLIGHT_CHECKLIST = [
  "PNR saved",
  "Web check-in done",
  "Boarding pass downloaded",
  "Baggage allowance checked",
];

export const TICKET_CHECKLIST = [
  "Official booking site/provider confirmed",
  "Opening hours and dates verified",
  "Tickets bought / confirmation saved",
];

export function checklistFromTitles(prefix: string, titles: string[], category?: string): ChecklistItem[] {
  return titles.map((title, i) => ({
    id: `${prefix}_${i + 1}`,
    title,
    checked: false,
    category,
    order: i,
  }));
}

/** Default checklist for a new booking of the given category. */
export function defaultChecklistFor(category: BookingCategory, idPrefix: string): ChecklistItem[] {
  switch (category) {
    case "accommodation":
      return checklistFromTitles(idPrefix, HOTEL_CHECKLIST);
    case "houseboat":
      return checklistFromTitles(idPrefix, HOUSEBOAT_CHECKLIST);
    case "cab":
      return checklistFromTitles(idPrefix, CAB_INCLUSIONS);
    case "flight":
      return checklistFromTitles(idPrefix, FLIGHT_CHECKLIST);
    case "ticket":
    case "show":
      return checklistFromTitles(idPrefix, TICKET_CHECKLIST);
    default:
      return [];
  }
}

export function seedData(now: string = new Date().toISOString()): TripData {
  const trip: Trip = {
    id: TRIP_ID,
    name: "Kerala Trip — October 2026",
    startDate: "2026-10-14",
    endDate: "2026-10-18",
    currency: "INR",
    timezone: "Asia/Kolkata",
    airportTargetStart: "12:00",
    airportTargetEnd: "12:30",
    dayLabels: {
      "2026-10-14": "Arrival day",
      "2026-10-15": "Munnar",
      "2026-10-16": "Backwaters / transfer",
      "2026-10-17": "Flexible day",
      "2026-10-18": "Departure day",
    },
    createdAt: now,
    updatedAt: now,
  };

  const booking = (
    id: string,
    category: BookingCategory,
    title: string,
    extra: Partial<Booking> = {},
  ): Booking => ({
    id,
    tripId: TRIP_ID,
    category,
    title,
    status: "pending",
    amountKind: "quoted",
    attachmentIds: [],
    checklist: defaultChecklistFor(category, `${id}_chk`),
    createdAt: now,
    updatedAt: now,
    ...extra,
  });

  const bookings: Booking[] = [
    booking("bk_flight_out", "flight", "Flight HYD → COK", {
      startDate: "2026-10-14",
      location: "Hyderabad (HYD) → Cochin International Airport (COK)",
      flight: { departureTime: "10:00" },
      notes: "Scheduled departure 10:00 AM. Airline, PNR, terminal, seats and arrival time to be added.",
    }),
    booking("bk_flight_ret", "flight", "Flight COK → HYD", {
      startDate: "2026-10-18",
      location: "Cochin International Airport (COK) → Hyderabad (HYD)",
      flight: { departureTime: "16:30" },
      notes: "Scheduled departure 4:30 PM. Airline, PNR, terminal and seats to be added.",
    }),
    booking("bk_cab_main", "cab", "Main cab for the trip (14–18 Oct)", {
      startDate: "2026-10-14",
      endDate: "2026-10-18",
      cab: {
        pickupDate: "2026-10-14",
        pickupPlace: "Cochin International Airport (COK)",
        dropoff: "Cochin International Airport (COK) on 18 Oct",
      },
      notes: "Pre-booked multi-day cab. Add provider, driver, vehicle and quote once confirmed.",
    }),
    booking("bk_stay_munnar", "accommodation", "Munnar stay (to confirm)", {
      status: "not-started",
      startDate: "2026-10-14",
      endDate: "2026-10-16",
      location: "Munnar",
    }),
    booking("bk_houseboat", "houseboat", "Houseboat / backwater stay (to confirm)", {
      status: "not-started",
      startDate: "2026-10-16",
      endDate: "2026-10-17",
      location: "Kumarakom or Alleppey (to be selected)",
    }),
    booking("bk_stay_17", "accommodation", "Stay for night of 17 Oct (to confirm)", {
      status: "not-started",
      startDate: "2026-10-17",
      endDate: "2026-10-18",
      notes: "Optional: Aaramgram Domes is a possible stay — not confirmed.",
    }),
  ];

  let order = 0;
  const act = (
    id: string,
    date: string,
    title: string,
    category: ActivityCategory,
    extra: Partial<ItineraryActivity> = {},
  ): ItineraryActivity => ({
    id,
    tripId: TRIP_ID,
    date,
    title,
    category,
    status: "planned",
    optional: false,
    bookingRequired: false,
    bookingIds: [],
    checklist: [],
    order: order++,
    createdAt: now,
    updatedAt: now,
    ...extra,
  });

  const optional = (extra: Partial<ItineraryActivity> = {}): Partial<ItineraryActivity> => ({
    optional: true,
    notes: VERIFY_NOTE,
    ...extra,
  });

  const activities: ItineraryActivity[] = [
    // 14 Oct — arrival day
    act("act_14_flight", "2026-10-14", "Flight HYD → COK", "travel", {
      startTime: "10:00",
      place: "Hyderabad (HYD) → Cochin (COK)",
      bookingRequired: true,
      bookingIds: ["bk_flight_out"],
      notes: "Scheduled departure 10:00 AM. Arrival time to be added.",
    }),
    act("act_14_cab", "2026-10-14", "Meet pre-booked cab at COK", "travel", {
      place: "Cochin International Airport",
      mapQuery: "Cochin International Airport",
      bookingRequired: true,
      bookingIds: ["bk_cab_main"],
    }),
    act("act_14_athirappilly", "2026-10-14", "Athirappilly Waterfalls", "sightseeing", optional({
      place: "Athirappilly Waterfalls",
      mapQuery: "Athirappilly Waterfalls",
    })),
    act("act_14_drive", "2026-10-14", "Drive to Munnar or planned nearby stay", "travel", {
      place: "Munnar",
      mapQuery: "Munnar, Kerala",
    }),
    act("act_14_checkin", "2026-10-14", "Check in", "check-in", {
      place: "Munnar stay (to confirm)",
      bookingRequired: true,
      bookingIds: ["bk_stay_munnar"],
    }),

    // 15 Oct — Munnar
    act("act_15_eravikulam", "2026-10-15", "Eravikulam National Park", "sightseeing", optional({
      place: "Eravikulam National Park",
      mapQuery: "Eravikulam National Park",
      bookingRequired: true,
      notes: `Subject to official opening and ticket availability. ${VERIFY_NOTE}`,
    })),
    act("act_15_tea", "2026-10-15", "Munnar Tea Museum / tea plantation visit", "sightseeing", optional({
      place: "Munnar",
      mapQuery: "Tea Museum Munnar",
    })),
    act("act_15_viewpoints", "2026-10-15", "Mattupetty Dam, Echo Point, Kundala Lake", "sightseeing", optional({
      place: "Munnar",
      mapQuery: "Mattupetty Dam Munnar",
    })),
    act("act_15_kalari", "2026-10-15", "Kalaripayattu show", "show", optional({
      place: "Munnar",
      bookingRequired: true,
    })),

    // 16 Oct — backwaters / transfer
    act("act_16_checkout", "2026-10-16", "Check out of Munnar stay", "check-in", {
      bookingIds: ["bk_stay_munnar"],
    }),
    act("act_16_periyar", "2026-10-16", "Periyar boating (if routing via Thekkady)", "sightseeing", optional({
      place: "Thekkady / Periyar",
      mapQuery: "Periyar Lake Thekkady",
      bookingRequired: true,
    })),
    act("act_16_transfer", "2026-10-16", "Transfer to backwater area", "travel", {
      place: "Kumarakom or Alleppey (to be selected)",
    }),
    act("act_16_houseboat", "2026-10-16", "Houseboat / backwater stay check-in", "check-in", {
      place: "Kumarakom or Alleppey (to be selected)",
      bookingRequired: true,
      bookingIds: ["bk_houseboat"],
      notes: "Overnight houseboat or confirmed accommodation.",
    }),

    // 17 Oct — flexible
    act("act_17_cruise", "2026-10-17", "Backwater cruise", "sightseeing", optional({
      place: "Kumarakom or Alleppey",
    })),
    act("act_17_aaramgram", "2026-10-17", "Aaramgram Domes (possible stay/stop)", "check-in", optional({
      place: "Aaramgram Domes",
      mapQuery: "Aaramgram Domes Kerala",
      bookingIds: ["bk_stay_17"],
      notes: `Possible stay — not confirmed. ${VERIFY_NOTE}`,
    })),
    act("act_17_fortkochi", "2026-10-17", "Kochi / Fort Kochi", "sightseeing", optional({
      place: "Fort Kochi",
      mapQuery: "Fort Kochi",
    })),
    act("act_17_kathakali", "2026-10-17", "Kathakali performance", "show", optional({
      place: "Kochi",
      bookingRequired: true,
    })),

    // 18 Oct — departure
    act("act_18_checkout", "2026-10-18", "Check out", "check-in", {
      bookingIds: ["bk_stay_17"],
    }),
    act("act_18_cab", "2026-10-18", "Cab to COK airport", "travel", {
      place: "Cochin International Airport",
      mapQuery: "Cochin International Airport",
      bookingIds: ["bk_cab_main"],
      notes: "Planning target: reach COK around 12:00–12:30 PM for the 4:30 PM flight. Not a live traffic estimate.",
    }),
    act("act_18_arrive", "2026-10-18", "Reach COK airport (planning target)", "buffer", {
      startTime: "12:00",
      endTime: "12:30",
      place: "Cochin International Airport",
      mapQuery: "Cochin International Airport",
    }),
    act("act_18_flight", "2026-10-18", "Flight COK → HYD", "travel", {
      startTime: "16:30",
      place: "Cochin (COK) → Hyderabad (HYD)",
      bookingRequired: true,
      bookingIds: ["bk_flight_ret"],
    }),
  ];

  const place = (id: string, name: string, area: string, plannedDate?: string): Place => ({
    id,
    tripId: TRIP_ID,
    name,
    area,
    plannedDate,
    visited: false,
    createdAt: now,
    updatedAt: now,
  });

  const places: Place[] = [
    place("pl_athirappilly", "Athirappilly Waterfalls", "Thrissur district", "2026-10-14"),
    place("pl_munnar", "Munnar", "Idukki district", "2026-10-15"),
    place("pl_eravikulam", "Eravikulam National Park", "Munnar", "2026-10-15"),
    place("pl_tea", "Munnar Tea Museum / tea plantations", "Munnar", "2026-10-15"),
    place("pl_mattupetty", "Mattupetty Dam", "Munnar", "2026-10-15"),
    place("pl_echo", "Echo Point", "Munnar", "2026-10-15"),
    place("pl_kundala", "Kundala Lake", "Munnar", "2026-10-15"),
    place("pl_thekkady", "Thekkady / Periyar", "Idukki district", "2026-10-16"),
    place("pl_kumarakom", "Kumarakom backwaters", "Kottayam district"),
    place("pl_alleppey", "Alleppey (Alappuzha) backwaters", "Alappuzha district"),
    place("pl_aaramgram", "Aaramgram Domes", "To confirm"),
    place("pl_fortkochi", "Fort Kochi", "Kochi"),
    place("pl_cok", "Cochin International Airport (COK)", "Nedumbassery, Kochi"),
  ];

  const contact = (id: string, label: string, order: number, extra: Partial<Contact> = {}): Contact => ({
    id,
    tripId: TRIP_ID,
    label,
    order,
    createdAt: now,
    updatedAt: now,
    ...extra,
  });

  const contacts: Contact[] = [
    contact("ct_emergency", "India emergency number", 0, {
      name: "Emergency services",
      phone: "112",
      notes: "Single emergency number for police, fire and ambulance in India.",
    }),
    contact("ct_driver", "Cab driver", 1),
    contact("ct_stay_munnar", "Munnar stay", 2),
    contact("ct_houseboat", "Houseboat / operator", 3),
    contact("ct_stay_17", "Stay — night of 17 Oct", 4),
    contact("ct_family", "Family / emergency contact", 5),
  ];

  const list = (id: string, title: string, order: number, titles: string[]): Checklist => ({
    id,
    tripId: TRIP_ID,
    title,
    order,
    items: checklistFromTitles(`${id}_i`, titles),
    createdAt: now,
    updatedAt: now,
  });

  const checklists: Checklist[] = [
    list("cl_docs", "Travel documents", 0, [
      "Flight tickets (both ways)",
      "Photo ID for every traveller",
      "Hotel / stay confirmations",
      "Houseboat confirmation",
      "Cab booking details",
      "Activity tickets",
    ]),
    list("cl_packing", "Packing", 1, [
      "Rain protection (umbrella / raincoat)",
      "Comfortable walking shoes",
      "Light layers for Munnar evenings",
      "Water bottles",
      "Snacks for the drives",
      "Toiletries",
      "Usual personal medicines, if needed",
      "Sunglasses and cap",
    ]),
    list("cl_family", "Family / children", 2, [
      "Snacks and drinks for children",
      "Change of clothes in day bag",
      "Entertainment for long drives",
      "Regularly used personal supplies",
    ]),
    list("cl_electronics", "Electronics", 3, [
      "Phone chargers",
      "Power bank (charged)",
      "Car charger / cable",
      "Earphones",
    ]),
    list("cl_home", "Before leaving home", 4, [
      "Lock doors and windows",
      "Switch off appliances and geyser",
      "Take out the trash",
      "Arrange plant watering / mail if needed",
      "Leave trip plan with family",
    ]),
    list("cl_followups", "Booking follow-ups", 5, [
      "Confirm cab provider, driver and quote",
      "Finalise Munnar stay",
      "Choose Kumarakom or Alleppey and book houseboat",
      "Decide on night of 17 Oct",
      "Check Eravikulam National Park opening and tickets",
      "Add flight PNRs to the app",
    ]),
  ];

  return {
    trip,
    activities,
    bookings,
    expenses: [],
    places,
    contacts,
    checklists,
    memories: [],
  };
}
