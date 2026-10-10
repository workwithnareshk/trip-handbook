// Versioned local schema. Bump SCHEMA_VERSION when a stored shape changes
// incompatibly and add a migration in db.ts / backup.ts.
export const SCHEMA_VERSION = 1;

export type BookingStatus =
  | "not-started"
  | "researching"
  | "pending"
  | "booked"
  | "paid"
  | "cancelled";

export type BookingCategory =
  | "flight"
  | "accommodation"
  | "houseboat"
  | "cab"
  | "ticket"
  | "show"
  | "other";

export type Trip = {
  id: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  currency: "INR";
  timezone: "Asia/Kolkata";
  /** Optional overall budget in INR. */
  budget?: number;
  /** Planning target for reaching COK on departure day (HH:mm). */
  airportTargetStart: string;
  airportTargetEnd: string;
  /** Short editable label per trip date, e.g. "Arrival day". */
  dayLabels: Record<string, string>;
  createdAt: string;
  updatedAt: string;
};

export type ActivityCategory =
  | "travel"
  | "sightseeing"
  | "meal"
  | "check-in"
  | "show"
  | "rest"
  | "buffer"
  | "other";

export type ActivityStatus = "planned" | "done" | "skipped";

export type ItineraryActivity = {
  id: string;
  tripId: string;
  date: string; // YYYY-MM-DD
  title: string;
  category: ActivityCategory;
  startTime?: string; // HH:mm local time
  endTime?: string;
  durationMinutes?: number;
  place?: string;
  notes?: string;
  status: ActivityStatus;
  /** Optional / still-a-maybe item rather than a firm plan. */
  optional: boolean;
  bookingRequired: boolean;
  bookingIds: string[];
  bookingUrl?: string;
  mapQuery?: string;
  checklist: ChecklistItem[];
  order: number;
  createdAt: string;
  updatedAt: string;
};

export type ChecklistItem = {
  id: string;
  title: string;
  checked: boolean;
  category?: string;
  notes?: string;
  order: number;
};

/** Extra fields used by cab / driver bookings. */
export type CabDetails = {
  driverName?: string;
  vehicleType?: string;
  registrationNumber?: string;
  pickupDate?: string;
  pickupTime?: string;
  pickupPlace?: string;
  dropoff?: string;
  route?: string;
};

export type Booking = {
  id: string;
  tripId: string;
  category: BookingCategory;
  title: string;
  status: BookingStatus;
  startDate?: string;
  endDate?: string;
  location?: string;
  provider?: string;
  referenceNumber?: string;
  contactName?: string;
  phone?: string;
  url?: string;
  /** Total amount for the booking in INR. */
  amount?: number;
  /** Whether `amount` is a firm quote or a rough estimate. */
  amountKind: "quoted" | "estimated";
  amountPaid?: number;
  paymentDueDate?: string;
  cancellationDeadline?: string;
  notes?: string;
  cab?: CabDetails;
  /** Flight-specific free-text details. */
  flight?: {
    airline?: string;
    flightNumber?: string;
    departureTime?: string; // HH:mm
    arrivalTime?: string; // HH:mm
    terminal?: string;
    seats?: string;
  };
  attachmentIds: string[];
  checklist: ChecklistItem[];
  createdAt: string;
  updatedAt: string;
};

export type ExpenseCategory =
  | "flights"
  | "accommodation"
  | "cab"
  | "tickets"
  | "food"
  | "shopping"
  | "fuel-tolls"
  | "other";

export type Expense = {
  id: string;
  tripId: string;
  date: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  payer?: string;
  paymentMethod?: string;
  bookingId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type Place = {
  id: string;
  tripId: string;
  name: string;
  area?: string;
  plannedDate?: string;
  address?: string;
  officialUrl?: string;
  notes?: string;
  visited: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Contact = {
  id: string;
  tripId: string;
  label: string;
  name?: string;
  phone?: string;
  notes?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
};

export type Checklist = {
  id: string;
  tripId: string;
  title: string;
  items: ChecklistItem[];
  order: number;
  createdAt: string;
  updatedAt: string;
};

export type Memory = {
  id: string;
  tripId: string;
  date: string;
  note: string;
  attachmentIds: string[];
  createdAt: string;
  updatedAt: string;
};

/** Binary file kept on this device only. Not included in JSON exports. */
export type Attachment = {
  id: string;
  name: string;
  type: string;
  size: number;
  blob: Blob;
  createdAt: string;
};

export type AttachmentMeta = Omit<Attachment, "blob">;

/** Everything that goes into a JSON backup. */
export type TripData = {
  trip: Trip;
  activities: ItineraryActivity[];
  bookings: Booking[];
  expenses: Expense[];
  places: Place[];
  contacts: Contact[];
  checklists: Checklist[];
  memories: Memory[];
};

export type CollectionName = Exclude<keyof TripData, "trip">;
