# deef-router
针对deef的思想设计的router，用于模块的初始化路由注册，提供history change时的callback环境。


# Usages
```js
// app.js
import deef from 'deef';
import createHashHistory from 'history/createHashHistory';
import deefRouter from './router';

export const app = deef();
export const connect = app.connect;
export const history = createHashHistory();
export const router = deefRouter({history});

// handler.js
import {router} from 'app';
router.register(rule, {onMatch, onBreakMatch}[, key]);
```


## rule
1、express style path
```js
const rule = '/:module/:page';
const rule = {path: '/', exact: true};
```

2、match pathname or search params
```js
const rule = {pathname: '/Test'};
const rule = {pathname: '/TodoEntry', search: '?from=Test'};
const rule = {pathname: '/TodoEntry', search: {from: 'Test'}};
const rule = {pathname: '/TodoEntry', search: {from: location.search.from => {}}};
```
*location.search是'?from=Test&otherKey=value'也会match上{search: '?from=Test'}*

3、function match
```js
const rule = ({pathname, search}) => {};
```
*return null or plain object, must pass key param*

**rule是用来声明你关心哪些级的path，或者哪些search param，只要你关心的url部分变了就会触发onMatch。也就是说，你不关心的url部分变了，即使新的url命中了你的rule，也并不会告知你。举例你的rule是{search: {from: page => ['page1', 'page2'].includes(page)}}，表明你关心pathname和search中的from，那么当url从/home?from=test到/home?from=test&id=1的时候并不会触发这个rule的onMatch，默认id你并不关心**


## onMatch(match, matchLog) match the rule
如针对rule '/Todo/:filter?'

location 从 /Test 到 /Todo/all时触发，此时无matchLog

location 从 /Todo/all 到 /Todo/active时触发，此时有matchLog(Array)
```js
router.register('/:module', {
    onMatch({params: {module}}) {
        //do something with *module*
    }
});
router.register({
        pathname: '/TodoEntry',
        search: {from: 'Test'}
    }, {
    onMatch({pathname, search: {from}}) {
        //do something with *from*
    }
});
```
*matchLogList意味着是在这同一个rule内，location的切换*

## onBreakMatch(matchLog) 从match到mismatch时触发
如针对rule '/Todo/:filter'

location 从 /Todo/all 到 /Todo/active不触发

location 再从 /Todo/active 到 /Test时触发

此时matchLog包含了两次match信息：
```js
[/Todo/active, /Todo/all] // 时间轴顺序从晚到早
```


## key
deef-router会根据key来保证同一个路由rule只注册一次（once on）

当rule不是function时，不是必须要传key的，会根据rule的特征自动生成唯一的key

当然，你也可以在任何调用的地方指定一个全局唯一的key来实现特殊逻辑，比如允许针对同一个rule注册两套路由规则

# Demo
[deef-examples-todomvc](https://github.com/homkai/deef/tree/master/examples/todomvc/)
