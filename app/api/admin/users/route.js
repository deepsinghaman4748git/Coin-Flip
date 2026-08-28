import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getAuthUser } from "../../../lib/auth";
import connectDB from "../../../lib/db";
import User from "../../../models/User";

export async function GET(request) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    if (user.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          message: "Admin access required",
        },
        { status: 403 }
      );
    }

    await connectDB();

    const users = await User.find({})
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("Admin Users Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load users",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const adminUser = await getAuthUser(request);

    if (!adminUser || adminUser.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Admin access required" },
        { status: 403 }
      );
    }

    await connectDB();

    const body = await request.json();
    const { action, userId } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "User ID is required" },
        { status: 400 }
      );
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    if (action === "adjust_balance") {
      const amount = Number(body.amount);
      const type = body.type; // 'credit' or 'debit'
      const note = body.note || "Admin balance adjustment";

      if (!Number.isFinite(amount) || amount <= 0) {
        return NextResponse.json(
          { success: false, message: "Valid amount is required" },
          { status: 400 }
        );
      }

      if (type === "credit") {
        targetUser.walletBalance = Math.max(0, Number(targetUser.walletBalance || 0)) + amount;
      } else if (type === "debit") {
        if (Number(targetUser.walletBalance || 0) < amount) {
          return NextResponse.json(
            { success: false, message: "User balance is less than debit amount" },
            { status: 400 }
          );
        }
        targetUser.walletBalance = Math.max(0, Number(targetUser.walletBalance || 0) - amount);
      } else {
        return NextResponse.json(
          { success: false, message: "Adjustment type must be 'credit' or 'debit'" },
          { status: 400 }
        );
      }

      await targetUser.save();

      // Record transaction
      const Transaction = (await import("../../../models/Transaction")).default;
      await Transaction.create({
        user: targetUser._id,
        type: type === "credit" ? "bonus" : "refund",
        amount,
        status: "approved",
        paymentMethod: "admin_manual",
        note: `[Admin ${type.toUpperCase()}] ${note}`,
      });

      return NextResponse.json({
        success: true,
        message: `Wallet ${type === "credit" ? "credited" : "debited"} successfully`,
        newBalance: targetUser.walletBalance,
      });
    }

    if (action === "grant_bonus") {
      const amount = Number(body.amount);
      const note = body.note || "Admin Manual Bonus Grant";

      if (!Number.isFinite(amount) || amount <= 0) {
        return NextResponse.json(
          { success: false, message: "Valid bonus amount is required" },
          { status: 400 }
        );
      }

      targetUser.walletBalance = Number(targetUser.walletBalance || 0) + amount;
      targetUser.hasClaimedWelcomeBonus = true;
      await targetUser.save();

      const Transaction = (await import("../../../models/Transaction")).default;
      await Transaction.create({
        user: targetUser._id,
        type: "welcome_bonus",
        amount,
        status: "approved",
        paymentMethod: "admin_manual",
        note: `[Admin Bonus] ${note}`,
      });

      return NextResponse.json({
        success: true,
        message: `Bonus of ₹${amount} granted successfully to ${targetUser.name}!`,
        newBalance: targetUser.walletBalance,
      });
    }

    if (action === "toggle_ban") {
      targetUser.isBanned = !targetUser.isBanned;
      targetUser.banReason = targetUser.isBanned ? (body.reason || "Suspicious Activity / Security Policy Violation") : "";
      await targetUser.save();

      return NextResponse.json({
        success: true,
        message: targetUser.isBanned ? "User account has been banned/locked" : "User account has been unbanned",
        isBanned: targetUser.isBanned,
      });
    }

    if (action === "change_role") {
      const newRole = body.role === "admin" ? "admin" : "user";
      targetUser.role = newRole;
      await targetUser.save();

      return NextResponse.json({
        success: true,
        message: `User role changed to ${newRole}`,
        role: targetUser.role,
      });
    }

    if (action === "reset_password") {
      const newPassword = body.newPassword ? String(body.newPassword).trim() : "Pass@" + Math.floor(1000 + Math.random() * 9000);

      if (newPassword.length < 6) {
        return NextResponse.json(
          { success: false, message: "New password must be at least 6 characters" },
          { status: 400 }
        );
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      targetUser.password = hashedPassword;
      targetUser.resetOtp = "";
      targetUser.resetOtpExpires = null;
      targetUser.passwordChangedAt = new Date();
      await targetUser.save();

      return NextResponse.json({
        success: true,
        message: `Password reset successfully for ${targetUser.name} (${targetUser.email})`,
        newPassword: newPassword,
      });
    }

    if (action === "update_linked_upi") {
      const newUpi = String(body.upiId || "").trim();
      const lockStatus = body.isLocked !== undefined ? Boolean(body.isLocked) : Boolean(newUpi);
      targetUser.linkedUpiId = newUpi;
      targetUser.isUpiLocked = lockStatus;
      await targetUser.save();

      return NextResponse.json({
        success: true,
        message: newUpi
          ? `Linked UPI updated to ${newUpi} (${lockStatus ? "Locked" : "Unlocked"})`
          : "Linked UPI cleared/reset",
        linkedUpiId: targetUser.linkedUpiId,
        isUpiLocked: targetUser.isUpiLocked,
      });
    }

    return NextResponse.json(
      { success: false, message: "Invalid action specified" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Admin User Action Error:", error);
    return NextResponse.json(
      { success: false, message: "User action failed", error: error.message },
      { status: 500 }
    );
  }
}