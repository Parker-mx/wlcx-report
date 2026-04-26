/* 物流状态映射 */
const StatusMap = {
  mainStatusMap: {
    WAIT_ACCEPT:  { text: '待揽收', color: '#FF9800' },
    ACCEPT:        { text: '已揽收', color: '#2196F3' },
    TRANSPORT:     { text: '运输中', color: '#2196F3' },
    DELIVERING:    { text: '派件中', color: '#9C27B0' },
    AGENT_SIGN:    { text: '已代签收', color: '#4CAF50' },
    SIGN:          { text: '已签收', color: '#4CAF50' },
    FAILED:        { text: '包裹异常', color: '#F44336' },
  },

  subStatusMap: {
    'RECEIVE':             '商家已提交发货，快递员正在接单',
    'WAIT_ACCEPT':          '商家还没把包裹交给快递员，等待揽收',
    'ACCEPT':               '快递员已取件，包裹正在路上',
    'TRANSPORT':            '包裹运输中，请耐心等待',
    'SEND_ON':             '包裹转寄新地址，请注意查收',
    'ARRIVE_CITY':          '包裹已到你所在的城市，快到了',
    'DELIVERING':           '快递员正在派送途中，马上到',
    'STA_INBOUND':          '包裹已到快递柜/驿站，记得取件',
    'AGENT_SIGN':           '包裹已由门卫/前台代签',
    'SIGN':                 '包裹已正常签收',
    'STA_SIGN':             '收件人已从快递柜/驿站取出',
    'RETURN_SIGN':           '包裹因拒收被退回，视为签收',
    'FAILED':               '包裹异常，请联系客服处理',
    'REFUSE_SIGN':          '收件人拒收，包裹将退回',
    'DELIVER_ABNORMAL':    '派送失败，请联系快递员或客服',
    'RETENTION':            '包裹还在快递柜/驿站，尽快去取',
    'ISSUE':                '包裹有问题，客服正在处理中',
    'RETURN':               '包裹正在退回发件地',
    'DAMAGE':              '包裹破损，请联系客服理赔',
    'CANCEL_ORDER':        '发件方取消了订单，包裹未发出',
  },

  getStatusText(subStatus) {
    if (!subStatus) return '';
    return this.subStatusMap[subStatus] || subStatus;
  },

  getMainStatusInfo(mainStatus) {
    if (!mainStatus) return { text: '未知', color: '#999' };
    return this.mainStatusMap[mainStatus] || { text: mainStatus, color: '#999' };
  },
};