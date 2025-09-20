export class AppError extends Error {
constructor(
message: string,
public status = 400,
public code: string = 'BAD_REQUEST',
public details?: unknown
) {
super(message);
}
}


export class Unauthorized extends AppError {
constructor(msg = 'Unauthorized') { super(msg, 401, 'UNAUTHORIZED'); }
}


export class Forbidden extends AppError {
constructor(msg = 'Forbidden') { super(msg, 403, 'FORBIDDEN'); }
}


export class NotFound extends AppError {
constructor(msg = 'Not Found') { super(msg, 404, 'NOT_FOUND'); }
}