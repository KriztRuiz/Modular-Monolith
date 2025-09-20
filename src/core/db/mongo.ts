import mongoose from 'mongoose';
import { env } from '../env';
import { log } from '../logger';


export async function connectMongo() {
await mongoose.connect(env.MONGO_URL);
log.info('MongoDB connected');
return mongoose.connection;
}