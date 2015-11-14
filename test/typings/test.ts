import { Promise } from '../../src/thenfail';

export async function foo(): Promise<number> {
	return Promise.resolve(0);
}

