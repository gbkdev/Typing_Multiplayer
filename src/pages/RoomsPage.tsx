import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { CreateRoomForm } from '@/features/multiplayer/CreateRoomForm'
import { JoinRoomForm } from '@/features/multiplayer/JoinRoomForm'
import { PublicRoomsList } from '@/features/multiplayer/PublicRoomsList'

export function RoomsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Create a room</CardTitle>
          </CardHeader>
          <CreateRoomForm />
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Join with a code</CardTitle>
          </CardHeader>
          <JoinRoomForm />
        </Card>
      </div>

      <div>
        <h2 className="mb-3 font-mono text-sm uppercase tracking-widest text-ink-400">Public rooms</h2>
        <PublicRoomsList />
      </div>
    </div>
  )
}
