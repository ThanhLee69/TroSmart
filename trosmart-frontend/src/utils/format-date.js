import dayjs from 'dayjs';

const formatDate = (date, format = 'DD/MM/YYYY') => {
    if (!date) return '';
    return dayjs(date).format(format);
};

export default formatDate;