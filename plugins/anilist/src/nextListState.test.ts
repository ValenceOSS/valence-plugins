import { nextListState } from './nextListState';

describe('nextListState', () => {
  it('raises progress, and never lowers it', () => {
    expect(nextListState(null, 3, 12)).toEqual({ status: 'watching', progress: 3, repeat: 0 });
    expect(nextListState({ status: 'watching', progress: 5, repeat: 0 }, 3, 12)).toBeNull();
    expect(nextListState({ status: 'paused', progress: 5, repeat: 0 }, 3, 12)).toEqual({
      status: 'watching',
      progress: 5,
      repeat: 0,
    });
    expect(nextListState({ status: 'watching', progress: 5, repeat: 0 }, 6, 12)).toEqual({
      status: 'watching',
      progress: 6,
      repeat: 0,
    });
  });

  it('completes the show at its last episode, and never counts past it', () => {
    expect(nextListState({ status: 'watching', progress: 11, repeat: 0 }, 12, 12)).toEqual({
      status: 'completed',
      progress: 12,
      repeat: 0,
    });
    expect(nextListState(null, 30, 12)).toEqual({ status: 'completed', progress: 12, repeat: 0 });
    expect(nextListState(null, 30, null)).toEqual({ status: 'watching', progress: 30, repeat: 0 });
  });

  it('leaves a completed show alone for an episode watched again partway through', () => {
    expect(nextListState({ status: 'completed', progress: 12, repeat: 0 }, 3, 12)).toBeNull();
  });

  it('starts a rewatch from the first episode, and completes it at the last', () => {
    const started = nextListState({ status: 'completed', progress: 12, repeat: 1 }, 1, 12);

    expect(started).toEqual({ status: 'repeating', progress: 1, repeat: 1 });
    expect(nextListState(started, 1, 12)).toBeNull();
    expect(nextListState(started, 7, 12)).toEqual({ status: 'repeating', progress: 7, repeat: 1 });
    expect(nextListState({ status: 'repeating', progress: 11, repeat: 1 }, 12, 12)).toEqual({
      status: 'completed',
      progress: 12,
      repeat: 2,
    });
    expect(nextListState({ status: 'completed', progress: 1, repeat: 0 }, 1, 1)).toEqual({
      status: 'completed',
      progress: 1,
      repeat: 1,
    });
  });

  it('leaves a rewatch count it doesn’t know as unknown', () => {
    expect(nextListState({ status: 'repeating', progress: 11, repeat: null }, 12, 12)).toEqual({
      status: 'completed',
      progress: 12,
      repeat: null,
    });
  });
});
