import { read } from './scoped-resource';

describe('read', () => {
  it('gives the value when there is one, and undefined (not a throw) while loading or after an error', () => {
    expect(read({ hasValue: () => true, value: () => 42 })).toBe(42);
    expect(
      read({
        hasValue: () => false,
        value: () => {
          throw new Error('Resource is currently in an error state');
        },
      }),
    ).toBeUndefined();
  });
});
