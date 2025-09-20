import { Schema, model } from 'mongoose';


const PostSchema = new Schema(
{
title: { type: String, required: true },
content: { type: String, required: true },
authorId: { type: String, required: true, index: true },
tenantId: { type: String },
},
{ timestamps: { createdAt: true, updatedAt: true } }
);


export const PostModel = model('Post', PostSchema);