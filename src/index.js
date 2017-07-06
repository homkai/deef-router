/**
 * Created by baidu on 17/6/27.
 */
import isString from 'lodash/isString';
import isFunction from 'lodash/isFunction';
import isEqual from 'lodash/isEqual';
import pick from 'lodash/pick';

import matchPath from './matchPath';

const COMPARE_MATCH_KEYS = ['path', 'params', 'url', 'pathname', 'search'];
const ruleList = [];

const on = ({history, compareMatchKeys = COMPARE_MATCH_KEYS}) => (rule, {onMatch, onBreakMatch}, key) => {
    // 一个rule只生效一次
    let ruleKey = isString(key) && key;
    if (!ruleKey) {
        if (isString(rule)) {
            ruleKey = rule;
        }
        else if (rule.path) {
            ruleKey = JSON.stringify(rule);
        }
        else if (isString(rule.pathname) || !isFunction(rule.search)) {
            ruleKey = `${rule.pathname}${getSearchKey(rule.search)}`;
        }
    }
    if (!ruleKey) {
        throw new Error('When rule is function must pass a globally unique `key` in the 3nd param');
    }

    if (ruleList.some(item => item.ruleKey === ruleKey)) {
        return;
    }

    // 放到ruleList，并立即触发匹配
    ruleList.push({
        rule,
        ruleKey,
        callbacks: {onMatch, onBreakMatch},
        matchLog: []
    });
    onHistoryChange(history.location);

    // 只建立一次history.listen
    ruleList.length === 1 && history.listen(onHistoryChange);

    // 监听history change
    function onHistoryChange(location) {
        const execList = [];
        ruleList.forEach(item => {
            const {rule, ruleKey, callbacks: {onMatch, onBreakMatch}} = item;
            const match = matchRule(location, rule);
            if (match && !isEqual(pick(item.matchLog[0], compareMatchKeys), pick(match, compareMatchKeys))) {
                onMatch && execList.push({ruleKey, onMatch: onMatch.bind(null, match, [...item.matchLog])});
                item.matchLog.unshift(match);
            }
            else if (!match && item.matchLog.length) {
                onBreakMatch && execList.push({ruleKey, onBreakMatch: onBreakMatch.bind(null, [...item.matchLog])});
                item.matchLog = [];
            }
        });
        // 先执行onBreakMatch，执行顺序按注册顺序从晚到早
        [...execList].reverse().forEach(item => {
            item.onBreakMatch && item.onBreakMatch();
        });
        // 再执行onMatch
        execList.forEach(item => {
            item.onMatch && item.onMatch();
        });
    }
};

export default ({history}) => {
    return {
        on: on({history})
    };
};

function matchRule(location, rule) {
    if (isString(rule.pathname) || rule.search && !isFunction(rule.search)) {
        let ret = {
            pathname: rule.pathname,
            search: {}
        };
        if (rule.pathname && rule.pathname !== location.pathname) {
            ret = null;
        }
        if (ret && rule.search) {
            const searchRule = isString(rule.search) ? parseSearch(rule.search) : rule.search;
            const searchParams = parseSearch(location.search);
            Object.keys(searchRule).every(key => {
                const valRule = searchRule[key];
                if ((isString(valRule) && valRule !== searchParams[key])
                    || (isFunction(valRule) && !valRule(searchParams[key]))) {
                    return false;
                }
                ret.search[key] = searchParams[key];
                return true;
            }) || (ret = null);
        }
        return ret;
    }
    if (isString(rule) || isString(rule.path)) {
        return matchPath(location.pathname || location.path, rule);
    }
    if (isFunction(rule)) {
        return rule(location);
    }
}

function parseSearch(str) {
    const ret = {};
    str.replace(/(^\?|&$)/g, '').split('&').forEach(item => {
        const [key, value] = item.split('=');
        ret[key] = value;
    });
    return ret;
}

function getSearchKey(search) {
    return search && '?' + (
            isString(search)
                ? search.replace(/(^\?|&$)/g, '')
                : Object.keys(search).map(key => isString(search[key]) ? `${key}=${search[key]}` : key).join('&')
        );
}