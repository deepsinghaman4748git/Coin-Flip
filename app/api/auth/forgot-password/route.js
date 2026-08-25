import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "../../../lib/db";
import User from "../../../models/User";

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, phone, email, identifier, otp, newPassword } = body;

    const targetInput = (phone || email || identifier || "").trim().toLowerCase();

    if (!targetInput) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter your registered Mobile Number or Email.",
        },
        { status: 400 }
      );
    }

    await connectDB();

    // Clean phone number (strip whitespace, dashes, leading +91 if needed)
    const cleanPhone = targetInput.replace(/[\s\-\(\)]/g, "");
    const cleanPhoneWithoutCountryCode = cleanPhone.replace(/^\+91/, "").replace(/^91(?=\d{10}$)/, "");

    // Search user
    const user = await User.findOne({
      $or: [
        { email: targetInput },
        { phone: targetInput },
        { phone: cleanPhone },
        { phone: cleanPhoneWithoutCountryCode },
      ],
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "No user found with this Mobile Number or Email address.",
        },
        { status: 404 }
      );
    }

    // Step 1: Send OTP
    if (action === "send_otp" || !action) {
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      user.resetOtp = generatedOtp;
      user.resetOtpExpires = expiresAt;
      await user.save();

      const maskedContact = user.phone
        ? user.phone.length > 4
          ? user.phone.slice(0, 2) + "******" + user.phone.slice(-2)
          : user.phone
        : user.email.replace(/(.{2})(.*)(?=@)/, "$1***");

      return NextResponse.json({
        success: true,
        message: `OTP sent successfully to ${maskedContact}! Valid for 10 minutes.`,
        otp: generatedOtp, // Sent for simulated SMS notification banner
        phone: user.phone || "",
        email: user.email,
      });
    }

    // Step 2: Verify OTP and Reset Password
    if (action === "verify_reset") {
      if (!otp) {
        return NextResponse.json(
          { success: false, message: "Please enter the 6-digit OTP code." },
          { status: 400 }
        );
      }

      if (!newPassword || newPassword.length < 6) {
        return NextResponse.json(
          { success: false, message: "New password must be at least 6 characters long." },
          { status: 400 }
        );
      }

      if (!user.resetOtp || String(user.resetOtp).trim() !== String(otp).trim()) {
        return NextResponse.json(
          { success: false, message: "Invalid OTP code. Please check and try again." },
          { status: 400 }
        );
      }

      if (user.resetOtpExpires && new Date() > new Date(user.resetOtpExpires)) {
        return NextResponse.json(
          { success: false, message: "OTP has expired. Please request a new OTP." },
          { status: 400 }
        );
      }

      // Hash new password and save
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedPassword;
      user.resetOtp = "";
      user.resetOtpExpires = null;
      user.passwordChangedAt = new Date();
      await user.save();

      return NextResponse.json({
        success: true,
        message: "Password reset successful! You can now log in with your new password.",
      });
    }

    return NextResponse.json(
      { success: false, message: "Invalid action." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Forgot Password Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to process password reset.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
