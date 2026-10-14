import cloudinary from "../config/cloudinary.js";
import { ApiError } from "../utils/ApiError.js";

export const uploadImageBuffer = (buffer, folder = "ecommerce/products") => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );

    stream.end(buffer);
  });
};

export const deleteImage = async (publicId) => {
  return cloudinary.uploader.destroy(publicId, { resource_type: "image" });
};

// Best-effort cleanup: log failures but never crash the request
export const deleteImages = async (publicIds) => {
  const results = await Promise.allSettled(publicIds.map((id) => deleteImage(id)));

  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error(`Failed to delete image ${publicIds[index]}:`, result.reason?.message);
    }
  });
};

export const uploadImages = async (files, folder = "ecommerce/products") => {
  const results = await Promise.allSettled(
    files.map((file) => uploadImageBuffer(file.buffer, folder))
  );

  const uploaded = results
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value);

  if (uploaded.length !== files.length) {
    await deleteImages(uploaded.map((image) => image.publicId));
    throw new ApiError(502, "Image upload failed, please try again");
  }

  return uploaded;
};