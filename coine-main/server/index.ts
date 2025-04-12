import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes"; // Custom route registration module
import { setupVite, serveStatic, log } from "./vite"; // Vite setup for frontend in development and production static file serving
import { scheduleAutomaticMaintenance } from "./db"; // Function to schedule database maintenance
import dotenv from "dotenv"; // Environment variable management
import { storage } from './storage';


// Load environment variables from a .env file
dotenv.config();

// Check if the deployment is in "free" mode based on command-line args or environment variables
const isFreeDeployment =
  process.argv.includes("free") ||
  process.env.DEPLOYMENT_MODE === "free" ||
  process.env.NODE_ENV === "production";

// If running in free deployment mode, log a message
if (isFreeDeployment) {
  console.log("Running in optimized deployment mode");
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// API Key validation for the /api/transfer route
const VALID_API_KEY = process.env.COINE_API_KEY || "seium1234554321";

// API route to handle coin transfer requests
app.post("/api/transfer", async (req: Request, res: Response) => {
  console.log("Received request to transfer coins"); // Log when the API is hit
  
  // Extract the authorization token from the request headers
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  // Validate the API key
  if (token !== VALID_API_KEY) {
    console.log("Invalid API Key"); // Log invalid API key
    return res.status(403).json({ error: "Invalid API Key" });
  }

  // Destructure the necessary fields from the request body
  const { senderEmail, to, amount } = req.body;

  try {
    // Input validation: Ensure required fields are provided and amount is a valid number
    if (!senderEmail || !to || !amount || isNaN(amount)) {
      console.log("Invalid input data"); // Log if inputs are invalid
      return res.status(400).json({ error: "Invalid input" });
    }

    // Fetch the sender and receiver user objects from storage
    const sender = await storage.getUserByEmail(senderEmail);
    const receiver = await storage.getUserByEmail(to);

    // Check if sender and receiver exist
    if (!sender) {
      console.log("Sender not found: ", senderEmail); // Log if sender is not found
      return res.status(404).json({ error: "Sender not found" });
    }
    if (!receiver) {
      console.log("Receiver not found: ", to); // Log if receiver is not found
      return res.status(404).json({ error: "Receiver not found" });
    }

    // Check if the sender has sufficient balance
    if (sender.balance < amount) {
      console.log("Insufficient balance in sender's account"); // Log insufficient balance
      return res.status(400).json({ error: "Insufficient balance" });
    }

    // Deduct the amount from sender and add it to receiver
    console.log(`Transferring ${amount} coins from ${senderEmail} to ${to}`);
    await storage.updateUser(sender.id, { balance: sender.balance - amount });
    await storage.updateUser(receiver.id, { balance: receiver.balance + amount });

    // Record the transaction
    await storage.createTransaction({
      amount,
      senderId: sender.id,
      receiverId: receiver.id,
      note: "External transfer via API"
    });

    console.log(`Successfully transferred ${amount} coins from ${senderEmail} to ${to}`); // Log success message

    // Return a success response with details
    return res.json({
      success: true,
      message: `Transferred ${amount} coins from ${senderEmail} to ${to}`,
      senderBalance: sender.balance - amount,
      receiverBalance: receiver.balance + amount,
    });
  } catch (error) {
    console.error("Transfer error:", error); // Log any unexpected error
    return res.status(500).json({ error: "Something went wrong" });
  }
});

// Main asynchronous function to register routes and start the server
(async () => {
  // Register routes asynchronously
  const server = await registerRoutes(app);

  // Global error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    console.error(err); // Log the error to the server console
  });

  // Serve frontend assets
  if (app.get("env") === "development") {
    // In development, set up Vite for hot module reloading and frontend build
    await setupVite(app, server);
  } else {
    // In production, serve static files from the 'dist' folder
    serveStatic(app);
  }

  // Define the server port (use environment variable or default to 5000)
  const port = parseInt(process.env.PORT || "5000", 10);

  // Configuration for the server
  const serverConfig: any = {
    port,
    host: "0.0.0.0", // Listen on all IPs
    reusePort: true, // Allow multiple processes to listen to the same port
  };

  // Adjust configuration for free deployment mode
  if (isFreeDeployment) {
    serverConfig.keepAliveTimeout = 30000; // Set timeout for connections in free mode
    log(`Free deployment mode - setting optimized server configuration`);
  }

  // Start the server
  server.listen(serverConfig, () => {
    log(`serving on port ${port}${isFreeDeployment ? " (free mode)" : ""}`);

    // Schedule periodic maintenance tasks
    scheduleAutomaticMaintenance();

    // Set up a ping endpoint to keep the server alive (for free hosting environments)
    setInterval(() => {
      fetch(`http://localhost:${port}/ping`);
    }, 5000);
  });
})();
