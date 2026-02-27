import { ipcMain } from 'electron'
import {
  deleteScene,
  ensureScenesSchema,
  getAllScenes,
  getScenesByProject,
  insertScene,
  replaceScenesByProject,
  type SceneRow,
  updateScene,
} from '../scenes'

export function registerScenesHandlers() {
  ensureScenesSchema()

  ipcMain.handle('scenes:getAll', () => getAllScenes())
  ipcMain.handle('scenes:getByProject', (_event, projectId: string) => getScenesByProject(projectId))
  ipcMain.handle('scenes:insert', (_event, scene: SceneRow) => insertScene(scene))
  ipcMain.handle('scenes:update', (_event, scene: SceneRow) => updateScene(scene))
  ipcMain.handle('scenes:replaceByProject', (_event, payload: { projectId: string; scenes: SceneRow[] }) => replaceScenesByProject(payload))
  ipcMain.handle('scenes:delete', (_event, id: string) => deleteScene(id))
}
