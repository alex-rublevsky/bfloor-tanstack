import { useEffect, useState } from "react";
import cloudflareLoader from "~/utils/image-loader";

type VideoProps = {
	src: string;
	className?: string;
	style?: React.CSSProperties;
	autoPlay?: boolean;
	loop?: boolean;
	muted?: boolean;
	playsInline?: boolean;
	onMouseEnter?: (e: React.MouseEvent<HTMLVideoElement>) => void;
	onMouseLeave?: (e: React.MouseEvent<HTMLVideoElement>) => void;
	onClick?: (e: React.MouseEvent<HTMLVideoElement>) => void;
};

export default function Video({
	src,
	className,
	style,
	autoPlay = false,
	loop = false,
	muted = false,
	playsInline = false,
	onMouseEnter,
	onMouseLeave,
	onClick,
}: VideoProps) {
	const [isClient, setIsClient] = useState(false);
	const videoSrc = cloudflareLoader({ src, width: 0, quality: 0 });

	useEffect(() => {
		setIsClient(true);
	}, []);

	return (
		<div className={className} style={style}>
			{isClient && (
				<video
					src={videoSrc}
					className="h-full w-full object-cover"
					autoPlay={autoPlay}
					loop={loop}
					muted={muted}
					playsInline={playsInline}
					onMouseEnter={onMouseEnter}
					onMouseLeave={onMouseLeave}
					onClick={onClick}
				/>
			)}
		</div>
	);
}
