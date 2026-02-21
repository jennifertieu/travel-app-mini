interface AvatarStackMember {
  avatar_url: string | null;
  display_name: string | null;
}

interface AvatarStackProps {
  members: AvatarStackMember[];
  max?: number;
  size?: "sm" | "md";
  className?: string;
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.charAt(0).toUpperCase();
}

const SIZE_CLASSES = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-xs",
} as const;

export function AvatarStack({
  members,
  max = 4,
  size = "sm",
  className = "",
}: AvatarStackProps) {
  if (members.length === 0) return null;

  const visible = members.slice(0, max);
  const overflow = members.length - max;
  const sizeClass = SIZE_CLASSES[size];

  return (
    <div className={`flex items-center -space-x-1.5 ${className}`}>
      {visible.map((member, i) => (
        <div
          key={i}
          className={`${sizeClass} rounded-full border-2 border-background flex items-center justify-center font-medium bg-secondary text-secondary-foreground overflow-hidden shrink-0`}
          title={member.display_name || "Anonymous"}
        >
          {member.avatar_url ? (
            <img
              src={member.avatar_url}
              alt={member.display_name || ""}
              className="w-full h-full object-cover rounded-full"
              referrerPolicy="no-referrer"
            />
          ) : (
            getInitials(member.display_name)
          )}
        </div>
      ))}
      {overflow > 0 && (
        <div
          className={`${sizeClass} rounded-full border-2 border-background bg-muted text-muted-foreground flex items-center justify-center font-medium shrink-0`}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
