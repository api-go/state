// test/core.test.js
import { _runCode, _returnCode } from '../src/core.js';

export async function testCore() {
    console.log('Testing core.js...');
    const vars = { a: 1, b: 2 };
    const extendVars = { c: 3 };
    
    // _runCode
    if (_runCode('return a + b + c', vars, {}, extendVars) !== 6) throw new Error('_runCode failed');
    
    // _returnCode
    if (_returnCode('a + b', vars, {}) !== 3) throw new Error('_returnCode simple failed');
    if (_returnCode('${a} + ${b}', vars, {}) !== '1 + 2') throw new Error('_returnCode template failed');
    
    console.log('core.js tests passed');
    return true;
}
