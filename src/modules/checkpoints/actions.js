import {isAtLocation} from 'lib/locationUtils'

export function saveCheckpoint(spaceId, newGraph) {
  return (dispatch, getState) => {
    dispatch({type: 'SAVE_CHECKPOINT', checkpoint: newGraph, spaceId})
  }
}

export function initSpace(spaceId, graph) {
  return (dispatch, getState) => {
    dispatch({type: 'INITIALIZE', checkpoint: graph, spaceId})
  }
}

function metricEquals(metric1, metric2) {
  return (
    metric1.name === metric2.name &&
    metric1.readableId === metric2.readableId &&
    isAtLocation(metric1.location, metric2.location)
  )
}

function guesstimateEquals(guesstimate1, guesstimate2) {
  return (
    guesstimate1.description === guesstimate2.description &&
    guesstimate1.guesstimateType === guesstimate2.guesstimateType &&
    guesstimate1.input === guesstimate2.input
  )
}

function updateMetricsAndGuesstimates(dispatch, spaceId, oldMetrics, newMetrics, oldGuesstimates, newGuesstimates) {
  const relevantOldMetrics = oldMetrics.filter(m => m.space === spaceId)
  const relevantOldGuesstimates = oldGuesstimates.filter(g => _.some(relevantOldMetrics, m => g.metric === m.id))

  const metricsToAdd = newMetrics.filter(m => !_.some(relevantOldMetrics, o => o.id === m.id))
  const metricsToDelete = relevantOldMetrics.filter(m => !_.some(newMetrics, n => n.id === m.id))
  const metricsToModify = relevantOldMetrics.filter(m => {
    const matchedMetric = _.find(newMetrics, n => n.id === m.id)
    if (!matchedMetric) { return false }
    const oldGuesstimate = _.find(oldGuesstimates, g => g.metric === m.id)
    const newGuesstimate = _.find(newGuesstimates, g => g.metric === matchedMetric.id)
    return (
      !metricEquals(matchedMetric, m) ||
      !guesstimateEquals(oldGuesstimate, newGuesstimate)
    )
  })

  const guesstimatesToAdd = newGuesstimates.filter(g => _.some(metricsToAdd, m => m.id === g.metric))
  const guesstimatesToDelete = oldGuesstimates.filter(g => _.some(metricsToDelete, m => m.id === g.metric))
  const guesstimatesToModify = oldGuesstimates.filter(g => _.some(metricsToModify, m => m.id === g.metric))

  debugger
}

// TODO(matthew): UNDO & REDO need to update current metrics and guesstimates :/
export function undo(spaceId) {
  return (dispatch, getState) => {
    console.log("Undoing.")
    const spaceCheckpoints = getState().checkpoints.find(r => r.spaceId === spaceId)
    if (!spaceCheckpoints) { return }

    const {head, checkpoints} = spaceCheckpoints
    if (head === checkpoints.length - 1) { return }
    const newGraph = checkpoints[head+1]
    const {metrics, guesstimates} = getState()
    updateMetricsAndGuesstimates(dispatch, spaceId, metrics, newGraph.metrics, guesstimates, newGraph.guesstimates)

    dispatch({type: 'UPDATE_FOR_SPACE', spaceId, newCheckpoints: {spaceId, head: head+1, checkpoints}})
  }
}

export function redo(spaceId) {
  return (dispatch, getState) => {
    console.log("Redoing.")
    const {head, checkpoints} = getState().checkpoints.find(r => r.spaceId === spaceId)
    if (head === 0) { return }
    const newGraph = checkpoints[head-1]
    const {metrics, guesstimates} = getState()
    updateMetricsAndGuesstimates(dispatch, spaceId, metrics, newGraph.metrics, guesstimates, newGraph.guesstimates)

    dispatch({type: 'UPDATE_FOR_SPACE', spaceId, newCheckpoints: {spaceId, head: head-1, checkpoints}})
  }
}
