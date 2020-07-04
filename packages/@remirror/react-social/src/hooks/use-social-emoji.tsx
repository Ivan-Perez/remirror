import { useCallback, useMemo } from 'react';

import { isEmptyArray, isUndefined, omit } from '@remirror/core';
import {
  EmojiExtension,
  EmojiObject,
  EmojiSuggestCommand,
  EmojiSuggestionChangeHandler,
  EmojiSuggestionExitHandler,
  EmojiSuggestionKeyBindings,
} from '@remirror/extension-emoji';
import { PartialDispatch, useExtension, useSetState } from '@remirror/react';

import { indexFromArrowPress } from '../social-utils';

export interface SocialEmojiState {
  /**
   * The list of emoji generated by the query.
   *
   * @default []
   */
  list: EmojiObject[];

  /**
   * The index of the currently matched emoji.
   *
   * @default 0
   */
  index: number;

  /**
   * The command to run to replace the query with the request emoji.
   *
   * @default undefined
   */
  command?: EmojiSuggestCommand;
}

const initialState: SocialEmojiState = { list: [], command: undefined, index: 0 };

interface EmojiHookParameter extends SocialEmojiState {
  setState: PartialDispatch<SocialEmojiState>;
}

/**
 * A hook for managing changes in the emoji suggestions.
 */
function useEmojiChangeHandler(setState: PartialDispatch<SocialEmojiState>) {
  const onChange: EmojiSuggestionChangeHandler = useCallback(
    (parameter) => {
      const { emojiMatches, command } = parameter;
      setState({
        list: emojiMatches,
        index: 0,
        command,
      });
    },
    [setState],
  );

  const onExit: EmojiSuggestionExitHandler = useCallback(() => {
    setState({
      list: [],
      index: 0,
      command: undefined,
    });
  }, [setState]);

  useExtension(
    EmojiExtension,
    ({ addHandler }) => {
      const change = addHandler('onChange', onChange);
      const exit = addHandler('onExit', onExit);

      return () => {
        change();
        exit();
      };
    },
    [onChange, onExit],
  );
}

/**
 * A hook for adding keybindings to the emoji dropdown.
 */
function useEmojiKeyBindings(parameter: EmojiHookParameter) {
  const { setState, command, index, list } = parameter;
  // Hide suggestions when there is no command available.
  const shouldHideSuggestions = !command;

  /**
   * Create the arrow bindings for the emoji suggesters.
   */
  const createArrowBinding = useCallback(
    (direction: 'up' | 'down') => () => {
      if (shouldHideSuggestions || isEmptyArray(list)) {
        return false;
      }

      // pressed up arrow
      const activeIndex = indexFromArrowPress({
        direction,
        matchLength: list.length,
        previousIndex: index,
      });

      setState({ index: activeIndex });

      return true;
    },
    [shouldHideSuggestions, index, list, setState],
  );

  const ArrowUp = useMemo(() => createArrowBinding('up'), [createArrowBinding]);
  const ArrowDown = useMemo(() => createArrowBinding('down'), [createArrowBinding]);

  const keyBindings: EmojiSuggestionKeyBindings = useMemo(
    () => ({
      /**
       * Handle the enter key being pressed
       */
      Enter: ({ command }) => {
        if (shouldHideSuggestions) {
          return false;
        }

        const emoji: EmojiObject | undefined = list[index];

        // Check if a matching id exists because the user has selected
        // something.
        if (isUndefined(emoji)) {
          return false;
        }

        command(emoji);

        return true;
      },

      /**
       * Clear suggestions when the escape key is pressed.
       */
      Escape: () => {
        setState(initialState);
        return true;
      },

      ArrowDown,
      ArrowUp,
    }),
    [ArrowDown, ArrowUp, shouldHideSuggestions, index, list, setState],
  );

  useExtension(
    EmojiExtension,
    (parameter) => {
      const { addCustomHandler } = parameter;

      return addCustomHandler('keyBindings', keyBindings);
    },
    [keyBindings],
  );
}

/**
 * The emoji state.
 */
function useEmojiState() {
  const [state, setState] = useSetState<SocialEmojiState>(initialState);
  return useMemo(() => ({ ...state, setState }), [setState, state]);
}

/**
 * This hook provides the state for setting up an emoji state change handler. It
 * applies the keybindings and the required change handlers.
 */
export function useSocialEmoji(): SocialEmojiState {
  const state = useEmojiState();

  useEmojiChangeHandler(state.setState);
  useEmojiKeyBindings(state);

  return useMemo(() => omit(state, 'setState'), [state]);
}
