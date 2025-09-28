import { MultisigMember } from "../../types/multisig";

interface MembersListProps {
  members: MultisigMember[];
}

export function MembersList({ members }: MembersListProps) {
  const formatPublicKey = (pubKey: string) =>
    `${pubKey.slice(0, 8)}...${pubKey.slice(-8)}`;

  return (
    <>
      {members.map((member, index) => (
        <div
          key={member.publicKey}
          className="flex items-center justify-between p-3 bg-white rounded border"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-mono">
                #{index + 1}
              </span>
              <span className="text-xs font-mono text-gray-700">
                {formatPublicKey(member.publicKey)}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Weight: {member.weight} • {member.isAccepted ? 'Accepted' : 'Pending'}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400">
              {member.isAccepted ? (
                <span className="text-green-600">✓</span>
              ) : (
                <span className="text-orange-600">⏳</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </>
  );
}