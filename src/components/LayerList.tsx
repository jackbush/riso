import {
  DndContext,
  closestCenter,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { Layer, InkColor } from '../types';
import { LayerActions } from '../hooks/useLayerState';
import { LayerTile } from './LayerTile';

const MAX_LAYERS = 7;

interface LayerListProps {
  layers: Layer[];
  actions: LayerActions;
}

export function LayerList({ layers, actions }: LayerListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      actions.reorderLayers(String(active.id), String(over.id));
    }
  }

  return (
    <div className="layer-list">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={layers.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          {layers.length === 0 && (
            <div style={{ padding: '1rem', textAlign: 'center', color: '#999', fontSize: '0.875rem' }}>
              No layers yet. Add a layer to get started.
            </div>
          )}
          {layers.map((layer) => (
            <LayerTile
              key={layer.id}
              layer={layer}
              onRemove={() => actions.removeLayer(layer.id)}
              onColorChange={(ink: InkColor) => actions.updateLayerColor(layer.id, ink)}
              onOpacityChange={(opacity: number) => actions.updateLayerOpacity(layer.id, opacity)}
              onImageUpload={(imageData: ImageData, grayscaleData: ImageData) =>
                actions.setLayerImage(layer.id, imageData, grayscaleData)
              }
            />
          ))}
        </SortableContext>
      </DndContext>

      <button
        onClick={actions.addLayer}
        disabled={layers.length >= MAX_LAYERS}
        style={{ marginTop: 'auto' }}
      >
        {layers.length >= MAX_LAYERS ? 'Max layers reached' : '+ Add Layer'}
      </button>
    </div>
  );
}
