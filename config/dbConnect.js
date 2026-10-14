import mongoose from "mongoose";
 
const connectDB = () => {
const mongoDb_uri=process.env.MONGODB_URI
  
  if (!mongoDb_uri) {
    console.error("MONGODB_URI is not defined in .env");
    process.exit(1);
  }

    return mongoose.connect(mongoDb_uri)
    .then(() => console.log("MongoDB connected"))
    .catch(err => {
        console.error(`Error in MongoDB connection: ${err}`);
        process.exit(1); 
    });
};

export default connectDB;