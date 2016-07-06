#!/usr/bin/env node
var clean           = require('../clean');
var upload          = require('../upload');
var prompt          = require('../prompt');
var cli             = require('cli');
var findProjectRoot = require('find-project-root');
var fs              = require('fs');
var path            = require('path');

var root = findProjectRoot(process.cwd(), {
  maxDepth: 12,
  markers : ['.git', '.hg', 'project.json']
});

//cli.debug('project root: ' + root);

var opts = {};
try {
  opts = require(path.join(root, 'dw.json'));
} catch (e) {
//  cli.debug(e)
  // no dw.json found
//  cli.debug('No dw.json found at the project root, continuing with configuration from arguments');
}

var copts = cli.parse({
  version    : ['V', 'Code version to upload to', 'string (Default is version1)'],
  hostname   : ['H', 'Hostname of remote DW server', 'host'],
  username   : ['u', 'Username for WebDav (Same as Business Manager)', 'string'],
  cartridges : ['C', 'Path to Cartridges from project root (Default is cartridges)', 'path'],
  save       : [false, 'Save settings for future use', 'bool'],
  prompt     : ['p', 'Prompt for password', 'bool'],
}, ['clean', 'upload', 'upload-version', 'init'])


function usage(flag){
  cli.error('please provide a ' + flag);
  cli.getUsage()
}

function arg(){
  if (cli.args.length > 0){
    return cli.args.shift();
  } 
  return undefined
}

if (cli.command == 'init'){
  prompt.init(opts).then((config) => {
    fs.writeFileSync(path.join(root, 'dw.json'), JSON.stringify(config, null, 2))
  })
} else {

  opts.hostname   = opts.hostname   || copts.hostname   || arg()              || usage('hostname');
  opts.version    = opts.version    || copts.version    || arg()              || 'version1';
  opts.username   = opts.username   || copts.username   || usage('username');
  opts.cartridges = opts.cartridges || copts.cartridges || arg()              || 'cartridges'

  if (cli.command == 'upload-version' || cli.command == 'upload'){
    opts.zipfile = arg() || usage('zip file to upload')
  }

  var gotPassword;

  if (!opts.password || copts.prompt) {
    gotPassword = prompt.getPassword(opts)
  } else {
    gotPassword = Promise.resolve(opts.password)
  }

  gotPassword.then((opts) => {
    if (copts.save){
      fs.writeFileSync(path.join(root, 'dw.json'), JSON.stringify(opts, null, 2))
    }

    opts.root = root;
    opts.cartridges = path.join(root, opts.cartridges);
    opts.prompt = prompt;
    
    switch (cli.command){
      case 'clean':
        clean(opts);
        break;
      case 'upload': case 'upload-version':
        upload(opts);
        break;
      default: 
        usage('command')
    }
  })
}
