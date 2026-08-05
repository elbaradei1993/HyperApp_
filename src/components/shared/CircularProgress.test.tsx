import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MultiSegmentCircularProgress } from './CircularProgress';

describe('MultiSegmentCircularProgress', () => {
  it('renders rounded normalized segments with independent glow filters', () => {
    const { container } = render(
      <MultiSegmentCircularProgress
        segments={[
          { percentage: 60, color: '#10b981', label: 'safe' },
          { percentage: 40, color: '#f59e0b', label: 'lively' },
        ]}
        glow
        centerContent={<span>60% Safe</span>}
      />,
    );

    const chart = container.querySelector('.multi-segment-circular-progress');
    const segments = container.querySelectorAll('circle[pathLength="100"]');

    expect(chart).toBeInTheDocument();
    expect(segments).toHaveLength(2);
    expect(container.querySelectorAll('filter')).toHaveLength(2);
    expect(container).toHaveTextContent('60% Safe');
  });
});
