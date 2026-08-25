import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      message: "Instant Fast Recharge is permanently disabled. Deposits must be submitted via UPI UTR with manual admin approval.",
    },
    { status: 403 }
  );
}
