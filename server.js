const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

let database = null;
const PORT = 3000;

const initializeServer = async () => {
  try {
    database = await open({
      filename: path.join(__dirname, "data.db"),
      driver: sqlite3.Database,
    });
    console.log("Connected to the database.");
    await setupDatabase();
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error(`Error initializing server: ${error.message}`);
    process.exit(1);
  }
};

const setupDatabase = async () => {
  try {
    await database.exec(`
      CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL
      );
    `);
    await database.exec(`
      CREATE TABLE IF NOT EXISTS addresses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          address TEXT NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users (id)
      );
    `);
    console.log("Database tables created or verified.");
  } catch (error) {
    console.error(`Error setting up database: ${error.message}`);
  }
};

app.post("/register", async (req, res) => {
  const { name, address } = req.body;

  if (!name || !address) {
    return res.status(400).json({
      success: false,
      message: "Name and address are required fields.",
    });
  }

  try {
    const existingUser = await database.get(
      "SELECT * FROM users WHERE name = ?",
      [name]
    );

    if (!existingUser) {
      const newUserId = uuidv4();
      await database.run("INSERT INTO users (id, name) VALUES (?, ?)", [
        newUserId,
        name,
      ]);
      await database.run(
        "INSERT INTO addresses (user_id, address) VALUES (?, ?)",
        [newUserId, address]
      );
      return res.json({
        success: true,
        message: "New user created and address saved.",
      });
    } else {
      await database.run(
        "INSERT INTO addresses (user_id, address) VALUES (?, ?)",
        [existingUser.id, address]
      );
      return res.json({
        success: true,
        message: "Address added to existing user.",
      });
    }
  } catch (error) {
    console.error(`Error processing request: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
});

initializeServer();
