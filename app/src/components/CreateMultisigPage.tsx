import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, AlertCircle } from "lucide-react";
import { Button } from "./ui/button";
import { PageHeader } from "./ui/page-header";
import { Input } from "./ui/input";
import { MemberInput } from "./multisig/MemberInput";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useCreateMultisig } from "../hooks/useCreateMultisig";
import { createMultisigSchema, type CreateMultisigForm, type Member } from "../lib/validations/multisig";
import { computeMultisigAddress } from "../lib/sui-utils";
import { extractPublicKey } from "../lib/wallet";
import { useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

export function CreateMultisigPage() {
  const currentAccount = useCurrentAccount();
  const createMultisig = useCreateMultisig();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Initialize form with React Hook Form
  const { register, handleSubmit, watch, setValue, formState: { errors, isValid } } = useForm<CreateMultisigForm>({
    resolver: zodResolver(createMultisigSchema),
    defaultValues: {
      name: '',
      members: [
        {
          id: 'creator',
          publicKey: '', // Will be filled when we have current account
          weight: 1,
          isCreator: true
        }
      ],
      threshold: 1
    }
  });

  const members = watch('members');
  const threshold = watch('threshold');
  const totalWeight = members.reduce((sum, m) => sum + m.weight, 0);

  // Set creator's public key when current account is available
  useEffect(() => {
    if (currentAccount && members[0]?.isCreator && !members[0]?.publicKey) {
      const creatorPubKey = extractPublicKey(
        new Uint8Array(currentAccount.publicKey),
        currentAccount.address
      );
      handleMemberChange('creator', { publicKey: creatorPubKey.toBase64() });
    }
  }, [currentAccount, members]);

  // Check if all members have valid public keys and we have at least 2 members
  const allMembersValid = members.every(m =>
    m.publicKey && !m.error
  );
  const hasMinimumMembers = members.length >= 2;
  const canSubmit = allMembersValid && hasMinimumMembers && isValid;

  // Compute multisig address preview
  const multisigPreview = computeMultisigAddress(
    members.map(m => m.publicKey),
    members.map(m => m.weight),
    threshold
  );

  const handleMemberChange = (id: string, updates: Partial<Member>) => {
    const newMembers = members.map(m =>
      m.id === id ? { ...m, ...updates } : m
    );
    setValue('members', newMembers);
  };

  const handleMemberRemove = (id: string) => {
    setValue('members', members.filter(m => m.id !== id));
  };

  const handleAddMember = () => {
    if (members.length < 10) {
      setValue('members', [...members, {
        id: Date.now().toString(),
        publicKey: '',
        weight: 1
      }]);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = members.findIndex(m => m.id === active.id);
      const newIndex = members.findIndex(m => m.id === over.id);

      const newMembers = arrayMove(members, oldIndex, newIndex);
      setValue('members', newMembers);
    }
  };

  const onSubmit = (data: CreateMultisigForm) => {
    createMultisig.mutate(data);
  };

  return (
    <div className="max-w-2xl mx-auto mt-8 px-4">
      <PageHeader
        title="Create New Multisig"
        backLink="/"
        backLabel="Back to Dashboard"
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-white rounded-lg border p-8 space-y-6">
          {/* Multisig Name */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Multisig Name
            </label>
            <Input
              {...register('name')}
              placeholder="e.g., Team Treasury, Personal Vault"
              maxLength={255}
            />
            {errors.name && (
              <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
            )}
          </div>

          {/* Members */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium">
                Members ({members.length}/10)
              </label>
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={members.map(m => m.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {members.map((member, index) => (
                    <MemberInput
                      key={member.id}
                      member={member}
                      index={index}
                      canRemove={members.length > 2}
                      onChange={handleMemberChange}
                      onRemove={handleMemberRemove}
                    />
                  ))}
                  {members.length < 10 && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={handleAddMember}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Another Member
                    </Button>
                  )}
                </div>
              </SortableContext>
            </DndContext>
            {errors.members && (
              <p className="text-sm text-red-500 mt-2">{errors.members.message}</p>
            )}
          </div>

          {/* Threshold */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Approval Threshold
            </label>
            <div className="flex items-center gap-4">
              <Input
                type="number"
                {...register('threshold', { valueAsNumber: true })}
                className="w-24"
                min={1}
                max={totalWeight}
              />
              <span className="text-sm text-gray-600">
                out of {totalWeight} total weight
              </span>
            </div>
            {errors.threshold && (
              <p className="text-sm text-red-500 mt-1">{errors.threshold.message}</p>
            )}
            <p className="text-sm text-gray-500 mt-2">
              Number of weighted votes required to execute transactions
            </p>
          </div>

          {/* Multisig Address Preview */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Multisig Address Preview
            </label>
            <div className="p-3 bg-gray-50 rounded-lg">
              {multisigPreview.address ? (
                <div>
                  <p className="text-sm font-mono text-gray-800 break-all">
                    {multisigPreview.address}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    ✓ Live preview based on current configuration
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-500">
                    {multisigPreview.error || 'Add valid members to see preview'}
                  </p>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              This address will be used to receive funds and execute transactions
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={createMultisig.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={createMultisig.isPending || !canSubmit}
            >
              {createMultisig.isPending ? "Creating..." : "Create Multisig"}
            </Button>
          </div>
          {!canSubmit && (
            <div className="text-sm text-amber-600 mt-2">
              {!hasMinimumMembers && (
                <p>A multisig requires at least 2 members. Please add another member.</p>
              )}
              {hasMinimumMembers && !allMembersValid && (
                <p>Please provide valid public keys for all members to continue.</p>
              )}
              {hasMinimumMembers && allMembersValid && !isValid && (
                <p>Please fix all validation errors before creating the multisig.</p>
              )}
            </div>
          )}
        </div>
      </form>

      {/* Info Boxes */}
      <div className="space-y-4 mt-6">
        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <h3 className="font-medium text-amber-900 mb-1">Member Registration</h3>
              <p className="text-sm text-amber-700">
                If an address is not registered in our system, you'll need to provide the public key instead.
                Public keys will be automatically registered when creating the multisig.
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-1">What happens next?</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• We'll register any new addresses from public keys</li>
            <li>• The multisig will be created on the Sui blockchain</li>
            <li>• Invitations will be sent to all members</li>
            <li>• Members will need to accept their invitations</li>
          </ul>
        </div>
      </div>
    </div>
  );
}