export type Token<T = any> = string & { __type?: T };


class Container {
private map = new Map<string, unknown>();
bind<T>(token: Token<T>, value: T) {
if (this.map.has(token)) throw new Error(`Token already bound: ${token}`);
this.map.set(token, value);
}
rebind<T>(token: Token<T>, value: T) {
this.map.set(token, value);
}
get<T>(token: Token<T>): T {
if (!this.map.has(token)) throw new Error(`Token not found: ${token}`);
return this.map.get(token) as T;
}
}


export const di = new Container();