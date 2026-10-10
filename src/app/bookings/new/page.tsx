"use client";

import { useState } from "react";
import { BookingForm, blankBooking } from "@/components/BookingForm";
import { PageHeader } from "@/components/ui";
import { useData } from "@/lib/store";

export default function NewBookingPage() {
  const data = useData();
  const [initial] = useState(() => blankBooking(data.trip.id));
  return (
    <>
      <PageHeader title="Add booking" subtitle="Fill in what you know. Everything can be edited later." />
      <BookingForm initial={initial} isNew />
    </>
  );
}
