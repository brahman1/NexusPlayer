import { fireEvent, render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { FocusableCard } from '../components/FocusableCard';

describe('FocusableCard', () => {
  it('déclenche son action quand elle est sélectionnée', async () => {
    const onPress = jest.fn();
    const screen = await render(
      <FocusableCard accessibilityLabel="Source M3U" onPress={onPress}>
        <Text>M3U</Text>
      </FocusableCard>,
    );

    fireEvent.press(screen.getByLabelText('Source M3U'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
