import type { ChipTone } from "@/components/ui";
import type { ActivityCategory, ActivityStatus, BookingCategory, BookingStatus, ExpenseCategory } from "./types";

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  "not-started": "Not started",
  researching: "Researching",
  pending: "Pending",
  booked: "Booked",
  paid: "Paid",
  cancelled: "Cancelled",
};

export const BOOKING_STATUS_TONE: Record<BookingStatus, ChipTone> = {
  "not-started": "gray",
  researching: "blue",
  pending: "amber",
  booked: "green",
  paid: "green",
  cancelled: "red",
};

export const BOOKING_STATUSES = Object.keys(BOOKING_STATUS_LABEL) as BookingStatus[];

export const BOOKING_CATEGORY_LABEL: Record<BookingCategory, string> = {
  flight: "Flights",
  accommodation: "Accommodation / hotels",
  houseboat: "Houseboat",
  cab: "Cab / driver",
  ticket: "Attraction / park tickets",
  show: "Shows / experiences",
  other: "Other",
};

export const BOOKING_CATEGORIES = Object.keys(BOOKING_CATEGORY_LABEL) as BookingCategory[];

export const ACTIVITY_CATEGORY_LABEL: Record<ActivityCategory, string> = {
  travel: "Travel",
  sightseeing: "Sightseeing",
  meal: "Meal",
  "check-in": "Stay / check-in",
  show: "Show",
  rest: "Rest",
  buffer: "Buffer",
  other: "Other",
};

export const ACTIVITY_CATEGORIES = Object.keys(ACTIVITY_CATEGORY_LABEL) as ActivityCategory[];

export const ACTIVITY_STATUS_LABEL: Record<ActivityStatus, string> = {
  planned: "Planned",
  done: "Done",
  skipped: "Skipped",
};

export const EXPENSE_CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  flights: "Flights",
  accommodation: "Accommodation",
  cab: "Cab",
  tickets: "Tickets / activities",
  food: "Food",
  shopping: "Shopping",
  "fuel-tolls": "Fuel / tolls",
  other: "Other",
};
