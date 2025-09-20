import { EventEmitter } from 'node:events';


export type DomainEvent = {
type: string;
payload: unknown;
};


class EventBus {
private emitter = new EventEmitter();


publish<T extends DomainEvent>(event: T) {
this.emitter.emit(event.type, event.payload);
}


subscribe<T>(type: string, handler: (payload: T) => void) {
this.emitter.on(type, handler);
}
}


export const bus = new EventBus();