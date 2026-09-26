import { render } from '@testing-library/react-native';
import { EmptyState, StatusBanner } from '../components/NexusUI';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

describe('Nexus UI states', () => {
  it('rend un état vide explicite', async () => {
    const view = await render(<EmptyState detail="Ajoutez une source autorisée." title="Aucun contenu" />);
    expect(view.getByText('Aucun contenu')).toBeTruthy();
    expect(view.getByText('Ajoutez une source autorisée.')).toBeTruthy();
  });

  it('annonce les erreurs de façon accessible', async () => {
    const view = await render(<StatusBanner kind="error" title="Connexion impossible" />);
    expect(view.getByText('Connexion impossible')).toBeTruthy();
  });
});
