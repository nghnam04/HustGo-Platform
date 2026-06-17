const today = new Date();

const formatDateAgo = (days) => {
    const d = new Date(today);
    d.setDate(d.getDate() - days);
    return d.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
};

export default formatDateAgo;