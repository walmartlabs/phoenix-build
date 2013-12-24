module.exports = function(grunt) {
  grunt.loadTasks(__dirname + '/../node_modules/lumbar/tasks');

  grunt.registerMultiTask('phoenix-build', 'outputs a projects module map', function() {
    var buildDir = 'build/dev',
        nodeModules = __dirname + '/../node_modules/';

    var options = this.options({
      configFile: './config/dev.json',
      lumbarFile: './lumbar.json',
      minimize: false,
      output: './build',
      removeTests: false,
      verbose: false
    });

    var taskName = this.nameArgs.replace(/:/g, '_');
    grunt.config('lumbar.' + taskName, {
      background: false,
      build: options.build && options.lumbarFile,
      watch: options.watch && options.lumbarFile,
      config: options.configFile,
      libraries: [
        __dirname + '/../mixin'
      ],
      minimize: options.minimize,
      output: options.output,
      package: options.package,
      plugins: [
        {use: nodeModules + 'lumbar-long-expires'},
        {use: nodeModules + 'lumbar-tester', withJson: {includeTests: !options.removeTests}},
        {use: nodeModules + 'lumbar-style-doc', withJson: {removeDocs: options.removeTests}},
        {use: 'conditional', withJson: {env: options.minimize ? 'production' : 'dev'}}
      ],
      sourceMap: options.sourceMap,
      verbose: options.verbose
    });
    grunt.task.run('lumbar:' + taskName);
  });
};
