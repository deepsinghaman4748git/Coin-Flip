import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getAuthUser } from "../../../lib/auth";
import connectDB from "../../../lib/db";
import User from "../../../models/User";

async function checkAdmin(request) {
  const user = await getAuthUser(request);
  if (!user || user.role !== "admin") return null;
  return user;
}

// GET: Current Admin Security Info
export async function GET(request) {
  try {
    const adminUser = await checkAdmin(request);
    if (!adminUser) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();
    const user = await User.findById(adminUser.userId).select(
      "name email role twoFactorEnabled passwordChangedAt createdAt"
    );

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Admin user not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      security: {
        name: user.name,
        email: user.email,
        twoFactorEnabled: !!user.twoFactorEnabled,
        passwordChangedAt: user.passwordChangedAt,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Admin Security GET error:", error);
    return NextResponse.json(
      { success: false, message: "Error fetching security profile" },
      { status: 500 }
    );
  }
}

// POST: Security Operations (Change Password, Enable 2FA PIN, Disable 2FA)
export async function POST(request) {
  try {
    const adminUser = await checkAdmin(request);
    if (!adminUser) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();
    const user = await User.findById(adminUser.userId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Admin user not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { action } = body;

    // 1. CHANGE PASSWORD
    if (action === "change_password") {
      const { currentPassword, newPassword, confirmPassword } = body;

      if (!currentPassword || !newPassword) {
        return NextResponse.json(
          { success: false, message: "Current and new password are required" },
          { status: 400 }
        );
      }

      if (newPassword !== confirmPassword) {
        return NextResponse.json(
          { success: false, message: "New passwords do not match" },
          { status: 400 }
        );
      }

      if (newPassword.length < 8) {
        return NextResponse.json(
          { success: false, message: "New password must be at least 8 characters long" },
          { status: 400 }
        );
      }

      const match = await bcrypt.compare(currentPassword, user.password);
      if (!match) {
        return NextResponse.json(
          { success: false, message: "Current password is incorrect" },
          { status: 400 }
        );
      }

      const hashed = await bcrypt.hash(newPassword, 12);
      user.password = hashed;
      user.passwordChangedAt = new Date();
      await user.save();

      return NextResponse.json({
        success: true,
        message: "Admin password updated successfully! Keep your new credentials safe.",
      });
    }

    // 2. SETUP / UPDATE 2FA SECURITY PIN
    if (action === "setup_2fa_pin") {
      const { currentPassword, pin, confirmPin } = body;

      if (!currentPassword || !pin) {
        return NextResponse.json(
          { success: false, message: "Current password and 6-digit PIN are required" },
          { status: 400 }
        );
      }

      const cleanPin = String(pin).trim();
      if (!/^\d{6}$/.test(cleanPin)) {
        return NextResponse.json(
          { success: false, message: "Security PIN must be exactly 6 numeric digits (e.g. 849201)" },
          { status: 400 }
        );
      }

      if (cleanPin !== String(confirmPin).trim()) {
        return NextResponse.json(
          { success: false, message: "PIN confirmation does not match" },
          { status: 400 }
        );
      }

      const match = await bcrypt.compare(currentPassword, user.password);
      if (!match) {
        return NextResponse.json(
          { success: false, message: "Incorrect password. Cannot set 2FA PIN." },
          { status: 400 }
        );
      }

      const hashedPin = await bcrypt.hash(cleanPin, 10);
      user.adminSecurityPin = hashedPin;
      user.twoFactorEnabled = true;
      await user.save();

      return NextResponse.json({
        success: true,
        message: "Two-Factor 6-Digit PIN activated! You will be required to enter this PIN whenever logging into the Admin Panel.",
      });
    }

    // 3. DISABLE 2FA PIN
    if (action === "disable_2fa") {
      const { currentPassword } = body;

      if (!currentPassword) {
        return NextResponse.json(
          { success: false, message: "Current password is required to disable 2FA" },
          { status: 400 }
        );
      }

      const match = await bcrypt.compare(currentPassword, user.password);
      if (!match) {
        return NextResponse.json(
          { success: false, message: "Incorrect password verification" },
          { status: 400 }
        );
      }

      user.twoFactorEnabled = false;
      user.adminSecurityPin = "";
      await user.save();

      return NextResponse.json({
        success: true,
        message: "Two-Factor authentication has been disabled.",
      });
    }

    return NextResponse.json(
      { success: false, message: "Unknown action specified" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Admin Security POST error:", error);
    return NextResponse.json(
      { success: false, message: "Error updating security configuration", error: error.message },
      { status: 500 }
    );
  }
}
