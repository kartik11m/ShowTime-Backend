import { clerkClient } from "@clerk/express";

export const protectAdmin = async(req,res,next)=>{
    try{
        const {userId} = req.auth();
        if (!userId) {
        return res.json({success: false, message: "User not authenticated"});
        }

        const user = await clerkClient.users.getUser(userId);

        if(user.privateMetadata.role !== 'admin'){
            return res.json({success: false , message:"not authorized"})
        }

        next();
        // for controller function
    }catch(error){
        return res.json({success: false , message:error.message})
    }
}

// This function is created so that user cannot get access to the admin things like adding shows
// means protecting the admin routes from the user