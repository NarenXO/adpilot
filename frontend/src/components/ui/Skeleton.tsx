import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
  rounded?: boolean | string | number;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '1rem',
  rounded = true,
  className = '',
  style,
  ...rest
}) => {
  const getBorderRadius = (): string => {
    if (typeof rounded === 'number') {
      return `${rounded}px`;
    }
    if (typeof rounded === 'string') {
      if (rounded === 'full') return '9999px';
      if (rounded === 'sm') return '0.25rem';
      if (rounded === 'md') return '0.375rem';
      if (rounded === 'lg') return '0.5rem';
      if (rounded === 'xl') return 'var(--radius-xl, 0.875rem)';
      return rounded;
    }
    return rounded ? 'var(--radius-xl, 0.875rem)' : '0px';
  };

  const skeletonStyle: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    borderRadius: getBorderRadius(),
    display: 'inline-block',
    verticalAlign: 'middle',
    ...style,
  };

  return (
    <div
      className={`adpilot-skeleton skeleton-shimmer ${className}`.trim()}
      style={skeletonStyle}
      aria-hidden="true"
      {...rest}
    />
  );
};

export default Skeleton;
