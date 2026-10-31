import '../src/index.css';
import { MemoryRouter } from 'react-router-dom';
import { extractComponentDescription as defaultExtractComponentDescription } from 'storybook/internal/docs-tools';

/** @type { import('@storybook/react-vite').Preview } */
const preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    docs: {
      extractComponentDescription: (component, options) => {
        const rawDescription = defaultExtractComponentDescription(component, options);
        if (!rawDescription) return null;
        // Loại bỏ các thẻ JSDoc @param (và @returns, @template nếu có) khỏi mô tả tổng quan của component
        return rawDescription
          .replace(/@(param|returns?|typedef|template)[\s\S]*?(?=(?:@[a-zA-Z]+|$))/g, '')
          .trim();
      },
    },
    a11y: {
      test: 'todo',
    },
  },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
};

export default preview;
