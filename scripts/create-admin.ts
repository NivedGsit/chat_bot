import connectDB from "../lib/mongodb";
import Admin from "../models/Admin";
import bcrypt from "bcryptjs";

async function createAdmin() {
  try {
    await connectDB();

    const hashedPassword = await bcrypt.hash("admin@1234", 10);

    await Admin.create({
      username: "admin",
      password: hashedPassword,
    });

    console.log("Admin user created successfully");
    process.exit(0);
  } catch (error) {
    console.error("Error creating admin user:", error);
    process.exit(1);
  }
}

createAdmin();
