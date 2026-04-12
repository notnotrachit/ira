import { createMockSnapshot } from '../mockSnapshot';
import { generateSuggestions } from '../suggestionEngine';

describe('generateSuggestions', () => {
  it('returns an upcoming meeting reminder near the top', () => {
    const suggestions = generateSuggestions(createMockSnapshot());
    const reminder = suggestions.find((item) => item.category === 'reminder');

    expect(reminder?.message).toContain('starts in');
  });

  it('returns a permission prompt when music access is unavailable', () => {
    const snapshot = createMockSnapshot();
    snapshot.permissions.music = 'not_determined';

    const suggestions = generateSuggestions(snapshot);

    expect(suggestions.some((item) => item.source === 'music')).toBe(true);
  });

  it('returns a wellness suggestion for low steps', () => {
    const snapshot = createMockSnapshot();
    snapshot.health.stepsToday = 1200;

    const suggestions = generateSuggestions(snapshot);

    expect(suggestions.some((item) => item.category === 'wellness')).toBe(true);
  });

  it('uses the actual message preview instead of inferring a random frequent contact', () => {
    const snapshot = createMockSnapshot();
    const unrelatedContactName = 'Dad';
    const messagePreview = 'Unread activity in a thread you were following';

    snapshot.messagesSummary.preview = messagePreview;
    snapshot.frequentContacts[0].displayName = unrelatedContactName;

    const suggestions = generateSuggestions(snapshot);
    const conversation = suggestions.find((item) => item.category === 'conversation');

    expect(conversation?.message).toContain(messagePreview);
    expect(conversation?.message).not.toContain(unrelatedContactName);
  });
});
