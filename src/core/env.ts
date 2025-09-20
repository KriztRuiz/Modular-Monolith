import dotenv from 'dotenv';


dotenv.config();


const required = (name: string, val: string | undefined) => {
if (!val) throw new Error(`Missing env var: ${name}`);
return val;
};


export const env = {
PORT: parseInt(process.env.PORT || '4000', 10),
MONGO_URL: required('MONGO_URL', process.env.MONGO_URL),
JWT_SECRET: required('JWT_SECRET', process.env.JWT_SECRET),
};