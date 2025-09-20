import { Schema, model } from 'mongoose';


const UserSchema = new Schema(
{
name: { type: String, required: true },
email: { type: String, required: true, unique: true, index: true },
role: { type: String, enum: ['user', 'admin'], default: 'user' },
passwordHash: { type: String, required: true },
tenantId: { type: String },
},
{ timestamps: { createdAt: true, updatedAt: true } }
);


export const UserModel = model('User', UserSchema);