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
  rounded = false,
  className = '',
  style,
  ...rest
}) => {
  const skeletonStyle: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    borderRadius: '0px',
    backgroundColor: '#e1e1d8',
    border: '3px solid #000000',
    display: 'inline-block',
    verticalAlign: 'middle',
    boxSizing: 'border-box',
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
