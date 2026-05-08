'use strict';

const state = {
  panelAttribute: 'data-cgpt-export-ext-panel',
  sharePanelAttribute: 'data-cgpt-export-ext-share-panel',
  scanTimer: 0,
  fileCounter: 1,
  fullExportRunning: false
};

const mimeDocx = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
