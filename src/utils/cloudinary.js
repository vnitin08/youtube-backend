import {v2 as cloudinary} from 'cloudinary';
import fs from 'fs';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) {
            throw new Error('No file path provided');
        }
        // Upload file to cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        // file uploaded successfully
        console.log('file is uploaded successfully on cloudinary', response.url);
        return response.url;
    }
    catch (error) {
        fs.unlinkSync(localFilePath); // remove file from local storage if upload fails
        return null;
    }
}


export {uploadOnCloudinary};