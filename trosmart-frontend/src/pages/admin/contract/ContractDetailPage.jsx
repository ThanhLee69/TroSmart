import React, { Fragment, useCallback, useEffect, useState } from "react";
import {
  Button,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Modal,
  Result,
  Select,
  Skeleton,
  Tooltip,
  Typography,
} from "antd";
import {
  ArrowLeftOutlined,
  EditOutlined,
  PrinterOutlined,
  WarningOutlined,
  ThunderboltOutlined,
  ExperimentOutlined,
  WifiOutlined,
  StarFilled,
  CalendarOutlined,
  StopOutlined,
  DeleteOutlined,
  PlusOutlined,
  UserAddOutlined,
  LogoutOutlined,
  LockOutlined,
  InfoCircleOutlined,
  UpOutlined,
  DownOutlined,
  SlackOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";

import {
  getContractById,
  extendContract,
  terminateContract,
  deleteContract,
  addCoTenant,
  removeCoTenant,
  addContractService,
  removeContractService,
  downloadContractPdf,
} from "../../../api/contractApi";
import { getTenantOptions } from "../../../api/tenantApi";
import { getServiceOptions } from "../../../api/serviceApi";
import { useNotify } from "../../../components/NotificationProvider";
import { path_name } from "../../../constants/path_name";
import "./ContractDetailPage.css";

const { Text } = Typography;

const CONTRACT_LIST_PATH = path_name.contract;

const getContractEditPath = (id) => `${CONTRACT_LIST_PATH}/${id}/cap-nhat`;

const STATUS = {
  DRAFT: { label: "Bản nháp", tone: "draft", color: "default" },
  ACTIVE: { label: "Đang hiệu lực", tone: "active", color: "success" },
  EXPIRED: { label: "Đã hết hạn", tone: "expired", color: "warning" },
  TERMINATED: {
    label: "Đã chấm dứt",
    tone: "terminated",
    color: "error",
  },
};

const PAYMENT_CYCLE_LABEL = {
  MONTHLY: "Hàng tháng",
  QUARTERLY: "Hàng quý",
  HALF_YEARLY: "6 tháng",
  YEARLY: "Hàng năm",
};

const formatDate = (value) => {
  if (!value) return "—";
  const date = dayjs(value);
  return date.isValid() ? date.format("DD/MM/YYYY") : "—";
};

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = dayjs(value);
  return date.isValid() ? date.format("DD/MM/YYYY HH:mm") : "—";
};

const money = (value) => {
  if (value == null || value === "") return "—";
  const number = Number(value);
  return Number.isFinite(number) ? `${number.toLocaleString("en-US")}đ` : "—";
};

const toList = (response) => {
  const data = response?.data?.result ?? response?.data ?? response;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;

  return [];
};

// Người ở cùng chưa chuyển đi (chưa có ngày chuyển đi)
const isActiveMember = (person) => !person.moveOutDate;

const personTenantId = (person) => person.tenantId ?? person.tenant?.id;

const serviceIdOf = (service) =>
  service.serviceId ?? service.serviceItem?.id ?? service.service?.id;

const initialsOf = (name = "") =>
  String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((word) => word[0]?.toUpperCase())
    .join("");

const serviceIcon = (name = "") => {
  const value = String(name).toLowerCase();

  if (value.includes("điện")) {
    return { icon: <ThunderboltOutlined />, tone: "elec" };
  }
  if (value.includes("nước")) {
    return { icon: <ExperimentOutlined />, tone: "water" };
  }
  if (value.includes("wifi") || value.includes("internet")) {
    return { icon: <WifiOutlined />, tone: "net" };
  }
  return { icon: <SlackOutlined />, tone: "other" };
};

// Đoạn văn dài: mặc định thu gọn, bấm "Xem thêm" để đọc hết
const Collapsible = ({ text, empty }) => {
  const [open, setOpen] = useState(false);

  if (!text) return <p className="cd-text cd-text--empty">{empty}</p>;

  const isLong = text.length > 320 || text.split("\n").length > 6;

  return (
    <>
      <p className={`cd-text ${isLong && !open ? "is-clamped" : ""}`}>{text}</p>

      {isLong && (
        <button
          type="button"
          className="cd-more"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Thu gọn" : "Xem thêm"}
          {open ? <UpOutlined /> : <DownOutlined />}
        </button>
      )}
    </>
  );
};

const ContractDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notify, contextHolder } = useNotify();
  const [modal, modalContextHolder] = Modal.useModal();

  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [extendForm] = Form.useForm();
  const [terminateForm] = Form.useForm();

  const [extendModalOpen, setExtendModalOpen] = useState(false);
  const [terminateModalOpen, setTerminateModalOpen] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);

  // Thêm / bớt người ở cùng, thêm / bỏ dịch vụ (hợp đồng đang hiệu lực)
  const [addTenantForm] = Form.useForm();
  const [moveOutForm] = Form.useForm();
  const [serviceForm] = Form.useForm();

  const [addTenantOpen, setAddTenantOpen] = useState(false);
  const [moveOutTarget, setMoveOutTarget] = useState(null);
  const [addServiceOpen, setAddServiceOpen] = useState(false);

  const [tenantList, setTenantList] = useState([]);
  const [serviceList, setServiceList] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(false);

  // =========================
  // LẤY CHI TIẾT HỢP ĐỒNG
  // =========================
  // silent = true: tải lại ngầm sau khi thao tác, không hiện khung chờ
  const fetchContract = useCallback(
    async (silent = false) => {
      if (!silent) {
        setLoading(true);
        setErrorStatus(null);
      }

      try {
        const data = await getContractById(id);

        if (!data) {
          setContract(null);
          setErrorStatus(404);
          return;
        }

        setContract({
          ...data,
          contractTenants: Array.isArray(data.contractTenants)
            ? data.contractTenants
            : [],
          contractServices: Array.isArray(data.contractServices)
            ? data.contractServices
            : [],
        });
      } catch (error) {
        console.error("Lấy chi tiết hợp đồng thất bại:", error);

        if (!silent) {
          setContract(null);
          setErrorStatus(error?.response?.status === 404 ? 404 : "error");
        }
      } finally {
        setLoading(false);
      }
    },
    [id],
  );

  useEffect(() => {
    fetchContract();
  }, [fetchContract]);

  // =========================
  // CHỈNH SỬA HỢP ĐỒNG
  // =========================
  const handleEdit = () => {
    if (!contract?.id) return;
    // Chỉ hợp đồng nháp mới được sửa
    if (contract.status !== "DRAFT") return;

    navigate(getContractEditPath(contract.id));
  };
  // Tải hợp đồng PDF theo mẫu để in và ký
  const handleDownloadPdf = async () => {
    if (!contract?.id || downloadingPdf) return;

    setDownloadingPdf(true);

    try {
      const blob = await downloadContractPdf(contract.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `hop-dong-${contract.contractCode || contract.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      notify({
        type: "error",
        message: "Tải hợp đồng thất bại",
        description:
          error?.response?.data?.message ||
          "Chưa tạo được file PDF. Vui lòng thử lại.",
      });
    } finally {
      setDownloadingPdf(false);
    }
  };
  // =========================
  // XÓA HỢP ĐỒNG NHÁP
  // =========================
  const handleDelete = () => {
    if (
      !contract?.id ||
      contract.status !== "DRAFT" ||
      deleting ||
      submittingAction
    ) {
      return;
    }

    modal.confirm({
      title: "Xóa hợp đồng?",
      content: `Bạn có chắc chắn muốn xóa hợp đồng ${
        contract.contractCode || `#${contract.id}`
      } không?`,
      okText: "Xóa hợp đồng",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      centered: true,
      maskClosable: false,
      onOk: async () => {
        if (deleting) return;

        setDeleting(true);

        try {
          await deleteContract(contract.id);

          notify({
            type: "success",
            message: "Xóa hợp đồng thành công",
            description: "Hợp đồng bản nháp đã được xóa.",
          });

          navigate(CONTRACT_LIST_PATH, { replace: true });
        } catch (error) {
          notify({
            type: "error",
            message: "Xóa hợp đồng thất bại",
            description:
              error?.response?.data?.message ||
              "Không thể xóa hợp đồng. Vui lòng thử lại.",
          });
          throw error;
        } finally {
          setDeleting(false);
        }
      },
    });
  };

  // =========================
  // GIA HẠN HỢP ĐỒNG
  // =========================
  const handleExtend = () => {
    if (!contract?.id || contract.status !== "ACTIVE") return;

    extendForm.resetFields();
    extendForm.setFieldsValue({
      newEndDate: null,
      rentPrice:
        contract.rentPrice != null ? Number(contract.rentPrice) : undefined,
      notes: "",
    });

    setExtendModalOpen(true);
  };

  const handleSubmitExtend = async () => {
    if (!contract?.id || submittingAction) return;

    try {
      const values = await extendForm.validateFields();
      setSubmittingAction(true);

      await extendContract(contract.id, {
        newEndDate: values.newEndDate.format("YYYY-MM-DD"),
        rentPrice: values.rentPrice,
        notes: values.notes?.trim() || null,
      });

      notify({
        type: "success",
        message: "Gia hạn hợp đồng thành công",
        description: "Thông tin hợp đồng đã được cập nhật.",
      });

      setExtendModalOpen(false);
      extendForm.resetFields();
      await fetchContract();
    } catch (error) {
      if (error?.errorFields) return;

      notify({
        type: "error",
        message: "Gia hạn hợp đồng thất bại",
        description:
          error?.response?.data?.message ||
          "Không thể gia hạn hợp đồng. Vui lòng thử lại.",
      });
    } finally {
      setSubmittingAction(false);
    }
  };

  // =========================
  // CHẤM DỨT HỢP ĐỒNG
  // =========================
  const handleTerminate = () => {
    if (!contract?.id || contract.status !== "ACTIVE") return;

    terminateForm.resetFields();
    setTerminateModalOpen(true);
  };

  const handleSubmitTerminate = async () => {
    if (!contract?.id || submittingAction) return;

    try {
      const values = await terminateForm.validateFields();
      setSubmittingAction(true);

      await terminateContract(contract.id, {
        terminationReason: values.terminationReason.trim(),
      });

      notify({
        type: "success",
        message: "Chấm dứt hợp đồng thành công",
        description: "Hợp đồng đã được chấm dứt và dữ liệu đã được cập nhật.",
      });

      setTerminateModalOpen(false);
      terminateForm.resetFields();
      await fetchContract();
    } catch (error) {
      if (error?.errorFields) return;

      notify({
        type: "error",
        message: "Chấm dứt hợp đồng thất bại",
        description:
          error?.response?.data?.message ||
          "Đã xảy ra lỗi khi chấm dứt hợp đồng. Vui lòng thử lại.",
      });
    } finally {
      setSubmittingAction(false);
    }
  };

  // =========================
  // THÊM NGƯỜI Ở CÙNG
  // =========================
  const loadTenantList = async () => {
    setOptionsLoading(true);

    try {
      setTenantList(toList(await getTenantOptions()));
    } catch (error) {
      console.error("Lấy danh sách khách thuê thất bại:", error);
      setTenantList([]);

      notify({
        type: "error",
        message: "Không thể tải danh sách khách thuê",
        description: error?.response?.data?.message || "Vui lòng thử lại sau.",
      });
    } finally {
      setOptionsLoading(false);
    }
  };

  const handleOpenAddTenant = () => {
    if (!contract?.id || contract.status !== "ACTIVE") return;

    addTenantForm.resetFields();
    addTenantForm.setFieldsValue({ tenantId: undefined, moveInDate: dayjs() });
    setAddTenantOpen(true);
    loadTenantList();
  };

  const handleSubmitAddTenant = async () => {
    if (!contract?.id || submittingAction) return;

    try {
      const values = await addTenantForm.validateFields();
      setSubmittingAction(true);

      await addCoTenant(contract.id, {
        tenantId: values.tenantId,
        moveInDate: values.moveInDate?.format("YYYY-MM-DD"),
      });

      notify({
        type: "success",
        message: "Thêm người ở cùng thành công",
      });

      setAddTenantOpen(false);
      addTenantForm.resetFields();
      await fetchContract(true);
    } catch (error) {
      if (error?.errorFields) return;

      notify({
        type: "error",
        message: "Thêm người ở cùng thất bại",
        description:
          error?.response?.data?.message ||
          "Không thể thêm người ở cùng. Vui lòng thử lại.",
      });
    } finally {
      setSubmittingAction(false);
    }
  };

  // =========================
  // BỚT NGƯỜI Ở CÙNG (GHI NGÀY CHUYỂN ĐI)
  // =========================
  const handleOpenMoveOut = (person) => {
    if (!contract?.id || contract.status !== "ACTIVE") return;

    moveOutForm.resetFields();
    moveOutForm.setFieldsValue({ moveOutDate: dayjs() });
    setMoveOutTarget(person);
  };

  const handleSubmitMoveOut = async () => {
    if (!contract?.id || !moveOutTarget || submittingAction) return;

    try {
      const values = await moveOutForm.validateFields();
      setSubmittingAction(true);

      await removeCoTenant(
        contract.id,
        personTenantId(moveOutTarget),
        values.moveOutDate?.format("YYYY-MM-DD"),
      );

      notify({
        type: "success",
        message: "Đã ghi nhận chuyển đi",
      });

      setMoveOutTarget(null);
      moveOutForm.resetFields();
      await fetchContract(true);
    } catch (error) {
      if (error?.errorFields) return;

      notify({
        type: "error",
        message: "Không thể ghi nhận chuyển đi",
        description: error?.response?.data?.message || "Vui lòng thử lại sau.",
      });
    } finally {
      setSubmittingAction(false);
    }
  };

  // =========================
  // THÊM DỊCH VỤ
  // =========================
  const loadServiceList = async () => {
    setOptionsLoading(true);

    try {
      setServiceList(toList(await getServiceOptions()));
    } catch (error) {
      console.error("Lấy danh sách dịch vụ thất bại:", error);
      setServiceList([]);

      notify({
        type: "error",
        message: "Không thể tải danh sách dịch vụ",
        description: error?.response?.data?.message || "Vui lòng thử lại sau.",
      });
    } finally {
      setOptionsLoading(false);
    }
  };

  const handleOpenAddService = () => {
    if (!contract?.id || contract.status !== "ACTIVE") return;

    serviceForm.resetFields();
    setAddServiceOpen(true);
    loadServiceList();
  };

  // Chọn dịch vụ thì tự điền đơn giá mặc định
  const handlePickService = (serviceId) => {
    const picked = serviceList.find(
      (item) => String(item.id ?? item.serviceId) === String(serviceId),
    );

    serviceForm.setFieldsValue({
      unitPrice: Number(picked?.price ?? picked?.unitPrice ?? 0),
    });
  };

  const handleSubmitAddService = async () => {
    if (!contract?.id || submittingAction) return;

    try {
      const values = await serviceForm.validateFields();
      setSubmittingAction(true);

      await addContractService(contract.id, {
        serviceId: Number(values.serviceId),
        unitPrice: Number(values.unitPrice),
      });

      notify({
        type: "success",
        message: "Thêm dịch vụ thành công",
        description: "Dịch vụ sẽ được tính từ kỳ hóa đơn sau.",
      });

      setAddServiceOpen(false);
      serviceForm.resetFields();
      await fetchContract(true);
    } catch (error) {
      if (error?.errorFields) return;

      notify({
        type: "error",
        message: "Thêm dịch vụ thất bại",
        description:
          error?.response?.data?.message ||
          "Không thể thêm dịch vụ. Vui lòng thử lại.",
      });
    } finally {
      setSubmittingAction(false);
    }
  };

  // =========================
  // BỎ DỊCH VỤ
  // =========================
  const handleRemoveService = (service) => {
    if (!contract?.id || contract.status !== "ACTIVE") return;
    if (service.removable === false) return;

    // id dòng dịch vụ trong hợp đồng (không phải id trong danh mục dịch vụ)
    const contractServiceId = service.id;

    if (contractServiceId == null) {
      notify({
        type: "error",
        message: "Không xác định được dịch vụ",
        description: "Dữ liệu dịch vụ của hợp đồng thiếu mã định danh.",
      });
      return;
    }

    modal.confirm({
      className: "cd-confirm",
      title: "Bỏ dịch vụ khỏi hợp đồng?",
      content: `Dịch vụ "${
        service.serviceName || service.name || "này"
      }" sẽ không được tính từ kỳ hóa đơn sau. Hóa đơn đã tạo không thay đổi.`,
      okText: "Bỏ dịch vụ",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      centered: true,
      maskClosable: false,
      onOk: async () => {
        try {
          await removeContractService(contract.id, contractServiceId);

          notify({
            type: "success",
            message: "Đã bỏ dịch vụ khỏi hợp đồng",
          });

          await fetchContract(true);
        } catch (error) {
          notify({
            type: "error",
            message: "Bỏ dịch vụ thất bại",
            description:
              error?.response?.data?.message ||
              "Không thể bỏ dịch vụ. Vui lòng thử lại.",
          });
          throw error;
        }
      },
    });
  };

  // =========================
  // AN TOÀN KHI CHƯA CÓ DỮ LIỆU
  // =========================
  if (loading) {
    return (
      <Fragment>
        {contextHolder}
        {modalContextHolder}
        <div style={{ padding: 24 }}>
          <Skeleton active paragraph={{ rows: 8 }} />
        </div>
      </Fragment>
    );
  }

  if (!contract) {
    return (
      <Fragment>
        {contextHolder}
        {modalContextHolder}
        <Result
          status={errorStatus === 404 ? "404" : "error"}
          title={
            errorStatus === 404
              ? "Không tìm thấy hợp đồng"
              : "Không thể tải hợp đồng"
          }
          subTitle={
            errorStatus === 404
              ? "Hợp đồng không tồn tại hoặc đã bị xóa."
              : "Đã xảy ra lỗi khi tải thông tin hợp đồng."
          }
          extra={
            <Button type="primary" onClick={() => navigate(CONTRACT_LIST_PATH)}>
              Quay lại danh sách
            </Button>
          }
        />
      </Fragment>
    );
  }

  // contract đã được kiểm tra tồn tại trước khi destructure
  const { status, contractTenants = [], contractServices = [] } = contract;

  const currentStatus = STATUS[status] || {
    label: status || "Không xác định",
    tone: "draft",
    color: "default",
  };

  const isActive = status === "ACTIVE";

  const activeMembers = contractTenants.filter(isActiveMember);

  // Người đang ở đứng trước, người đã chuyển đi xuống cuối
  const sortedTenants = [...contractTenants].sort(
    (a, b) => Number(!isActiveMember(a)) - Number(!isActiveMember(b)),
  );

  // Khách chưa ở trong hợp đồng mới được chọn thêm
  const memberIds = new Set(
    activeMembers.map((person) => String(personTenantId(person))),
  );
  if (contract.tenantId != null) memberIds.add(String(contract.tenantId));

  const addTenantChoices = tenantList
    .map((tenant) => ({
      value: tenant.id ?? tenant.tenantId,
      label:
        tenant.fullName ??
        tenant.tenantName ??
        tenant.name ??
        tenant.label ??
        tenant.phone,
    }))
    .filter(
      (option) => option.value != null && !memberIds.has(String(option.value)),
    );

  // Dịch vụ chưa có trong hợp đồng mới được chọn thêm
  const contractServiceIds = new Set(
    contractServices.map((service) => String(serviceIdOf(service))),
  );

  const addServiceChoices = serviceList
    .map((service) => ({
      value: service.id ?? service.serviceId,
      label: service.name ?? service.serviceName,
    }))
    .filter(
      (option) =>
        option.value != null && !contractServiceIds.has(String(option.value)),
    );

  const ended = status === "EXPIRED" || status === "TERMINATED";

  const fixedServicesTotal = contractServices
    .filter((service) => service.billingType === "FIXED_MONTHLY")
    .reduce(
      (total, service) =>
        total + Number(service.unitPrice ?? service.price ?? 0),
      0,
    );

  const fixedMonthlyTotal =
    Number(contract.rentPrice || 0) + fixedServicesTotal;

  return (
    <Fragment>
      {contextHolder}
      {modalContextHolder}

      {/* MODAL GIA HẠN HỢP ĐỒNG */}
      <Modal
        className="cd-modal"
        centered
        width="min(480px, calc(100vw - 24px))"
        title="Gia hạn hợp đồng"
        open={extendModalOpen}
        onCancel={() => {
          if (submittingAction) return;
          setExtendModalOpen(false);
          extendForm.resetFields();
        }}
        onOk={handleSubmitExtend}
        okText="Xác nhận gia hạn"
        cancelText="Hủy"
        confirmLoading={submittingAction}
        closable={!submittingAction}
        maskClosable={!submittingAction}
        destroyOnHidden
      >
        <div className="cd-modal__info">
          <InfoCircleOutlined />
          <span>
            Hợp đồng{" "}
            <strong>{contract.contractCode || `#${contract.id}`}</strong> ·
            Phòng {contract.roomNumber || "—"}. Ngày kết thúc hiện tại:{" "}
            <strong>{formatDate(contract.endDate)}</strong>.
          </span>
        </div>

        <Form
          form={extendForm}
          layout="vertical"
          requiredMark={false}
          className="cd-modal__form"
        >
          <Form.Item
            name="newEndDate"
            label="Ngày kết thúc mới"
            rules={[
              {
                required: true,
                message: "Vui lòng chọn ngày kết thúc mới",
              },
              {
                validator: (_, value) =>
                  value && value.isAfter(dayjs(), "day")
                    ? Promise.resolve()
                    : Promise.reject(
                        new Error("Ngày kết thúc mới phải nằm trong tương lai"),
                      ),
              },
            ]}
          >
            <DatePicker
              style={{ width: "100%" }}
              format="DD/MM/YYYY"
              placeholder="Chọn ngày kết thúc mới"
              disabledDate={(date) => !date.isAfter(dayjs(), "day")}
            />
          </Form.Item>

          <Form.Item
            name="rentPrice"
            label="Giá thuê mới (VNĐ/tháng)"
            rules={[
              { required: true, message: "Vui lòng nhập giá thuê" },
              {
                type: "number",
                min: 0.01,
                message: "Giá thuê phải lớn hơn 0",
              },
            ]}
          >
            <InputNumber
              style={{ width: "100%" }}
              min={0.01}
              precision={0}
              placeholder="Nhập giá thuê mới"
              formatter={(value) =>
                value == null
                  ? ""
                  : `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
              }
              parser={(value) => value?.replace(/,/g, "")}
            />
          </Form.Item>

          <Form.Item
            name="notes"
            label="Ghi chú"
            rules={[{ max: 5000, message: "Ghi chú tối đa 5000 ký tự" }]}
          >
            <Input.TextArea
              rows={3}
              maxLength={5000}
              showCount
              placeholder="Nhập ghi chú nếu có"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* MODAL THÊM NGƯỜI Ở CÙNG */}
      <Modal
        className="cd-modal"
        centered
        width="min(480px, calc(100vw - 24px))"
        title="Thêm người ở cùng"
        open={addTenantOpen}
        onCancel={() => {
          if (submittingAction) return;
          setAddTenantOpen(false);
          addTenantForm.resetFields();
        }}
        onOk={handleSubmitAddTenant}
        okText="Thêm người ở cùng"
        cancelText="Hủy"
        confirmLoading={submittingAction}
        closable={!submittingAction}
        maskClosable={!submittingAction}
        destroyOnHidden
      >
        <div className="cd-modal__info">
          <InfoCircleOutlined />
          <span>
            Phòng {contract.roomNumber || "—"} · Hợp đồng{" "}
            {contract.contractCode || `#${contract.id}`}
          </span>
        </div>

        <Form
          form={addTenantForm}
          layout="vertical"
          requiredMark={false}
          className="cd-modal__form"
        >
          <Form.Item
            name="tenantId"
            label="Khách thuê"
            rules={[{ required: true, message: "Vui lòng chọn khách thuê" }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Chọn khách thuê"
              loading={optionsLoading}
              options={addTenantChoices}
            />
          </Form.Item>

          <Form.Item
            name="moveInDate"
            label="Ngày vào ở"
            rules={[{ required: true, message: "Vui lòng chọn ngày vào ở" }]}
          >
            <DatePicker
              style={{ width: "100%" }}
              format="DD/MM/YYYY"
              disabledDate={(date) =>
                date.isAfter(dayjs(), "day") ||
                date.isBefore(dayjs(contract.startDate), "day")
              }
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* MODAL CHUYỂN ĐI */}
      <Modal
        className="cd-modal"
        centered
        width="min(480px, calc(100vw - 24px))"
        title="Ghi nhận người ở cùng chuyển đi"
        open={Boolean(moveOutTarget)}
        onCancel={() => {
          if (submittingAction) return;
          setMoveOutTarget(null);
          moveOutForm.resetFields();
        }}
        onOk={handleSubmitMoveOut}
        okText="Xác nhận chuyển đi"
        cancelText="Hủy"
        okButtonProps={{ danger: true }}
        confirmLoading={submittingAction}
        closable={!submittingAction}
        maskClosable={!submittingAction}
        destroyOnHidden
      >
        <div className="cd-modal__info">
          <InfoCircleOutlined />
          <span>
            <strong>
              {moveOutTarget?.fullName || moveOutTarget?.tenantName || ""}
            </strong>{" "}
            sẽ được ghi nhận đã chuyển khỏi phòng. Hợp đồng vẫn giữ lịch sử
            người này.
          </span>
        </div>

        <Form
          form={moveOutForm}
          layout="vertical"
          requiredMark={false}
          className="cd-modal__form"
        >
          <Form.Item
            name="moveOutDate"
            label="Ngày chuyển đi"
            rules={[
              { required: true, message: "Vui lòng chọn ngày chuyển đi" },
            ]}
          >
            <DatePicker
              style={{ width: "100%" }}
              format="DD/MM/YYYY"
              disabledDate={(date) =>
                date.isAfter(dayjs(), "day") ||
                (moveOutTarget?.moveInDate &&
                  date.isBefore(dayjs(moveOutTarget.moveInDate), "day"))
              }
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* MODAL THÊM DỊCH VỤ */}
      <Modal
        className="cd-modal"
        centered
        width="min(480px, calc(100vw - 24px))"
        title="Thêm dịch vụ vào hợp đồng"
        open={addServiceOpen}
        onCancel={() => {
          if (submittingAction) return;
          setAddServiceOpen(false);
          serviceForm.resetFields();
        }}
        onOk={handleSubmitAddService}
        okText="Thêm dịch vụ"
        cancelText="Hủy"
        confirmLoading={submittingAction}
        closable={!submittingAction}
        maskClosable={!submittingAction}
        destroyOnHidden
      >
        <div className="cd-modal__info">
          <InfoCircleOutlined />
          <span>
            Dịch vụ thêm vào sẽ được tính từ kỳ hóa đơn sau. Muốn đổi giá một
            dịch vụ, hãy bỏ dịch vụ đó rồi thêm lại.
          </span>
        </div>

        <Form
          form={serviceForm}
          layout="vertical"
          requiredMark={false}
          className="cd-modal__form"
        >
          <Form.Item
            name="serviceId"
            label="Dịch vụ"
            rules={[{ required: true, message: "Vui lòng chọn dịch vụ" }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Chọn dịch vụ"
              loading={optionsLoading}
              options={addServiceChoices}
              onChange={handlePickService}
              notFoundContent="Không còn dịch vụ nào để thêm"
            />
          </Form.Item>

          <Form.Item
            name="unitPrice"
            label="Đơn giá (VNĐ)"
            extra="Đơn giá này chỉ áp dụng cho hợp đồng, không đổi giá trong danh mục dịch vụ."
            rules={[
              { required: true, message: "Vui lòng nhập đơn giá" },
              { type: "number", min: 0, message: "Đơn giá không được âm" },
            ]}
          >
            <InputNumber
              style={{ width: "100%" }}
              min={0}
              precision={0}
              placeholder="Nhập đơn giá"
              formatter={(value) =>
                value == null
                  ? ""
                  : `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
              }
              parser={(value) => value?.replace(/,/g, "")}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* MODAL CHẤM DỨT HỢP ĐỒNG */}
      <Modal
        className="cd-modal"
        centered
        width="min(480px, calc(100vw - 24px))"
        title="Chấm dứt hợp đồng"
        open={terminateModalOpen}
        onCancel={() => {
          if (submittingAction) return;
          setTerminateModalOpen(false);
          terminateForm.resetFields();
        }}
        onOk={handleSubmitTerminate}
        okText="Xác nhận chấm dứt"
        cancelText="Hủy"
        okButtonProps={{ danger: true }}
        confirmLoading={submittingAction}
        closable={!submittingAction}
        maskClosable={!submittingAction}
        destroyOnHidden
      >
        <div className="cd-modal__info cd-modal__info--danger">
          <WarningOutlined />
          <span>
            Hợp đồng{" "}
            <strong>{contract.contractCode || `#${contract.id}`}</strong> ·
            Phòng {contract.roomNumber || "—"} sẽ bị chấm dứt. Thao tác này
            không thể hoàn tác.
          </span>
        </div>

        <Form
          form={terminateForm}
          layout="vertical"
          requiredMark={false}
          className="cd-modal__form"
        >
          <Form.Item
            name="terminationReason"
            label="Lý do chấm dứt"
            rules={[
              {
                required: true,
                whitespace: true,
                message: "Vui lòng nhập lý do chấm dứt hợp đồng",
              },
              {
                max: 5000,
                message: "Lý do tối đa 5000 ký tự",
              },
            ]}
          >
            <Input.TextArea
              rows={4}
              maxLength={5000}
              showCount
              placeholder="Nhập lý do chấm dứt hợp đồng"
            />
          </Form.Item>
        </Form>
      </Modal>

      <div className="cd">
        {/* TIÊU ĐỀ */}
        <div className="cd__head">
          <div className="cd__head-left">
            <Button
              className="cd__back"
              icon={<ArrowLeftOutlined />}
              aria-label="Quay lại danh sách hợp đồng"
              onClick={() => navigate(CONTRACT_LIST_PATH)}
            />

            <div className="cd__head-text">
              <div className="cd__title-row">
                <h1 className="cd__title">
                  Hợp đồng {contract.contractCode || `#${contract.id}`}
                </h1>
                <span className={`cd-pill cd-pill--${currentStatus.tone}`}>
                  <i />
                  {currentStatus.label}
                </span>
              </div>

              <span className="cd__sub">
                Phòng {contract.roomNumber || "—"} ·{" "}
                {contract.buildingName || "Chưa có tòa nhà"} ·{" "}
                {contract.tenantName || "Chưa có người đại diện"}
              </span>
            </div>
          </div>

          {/* CÁC NÚT THAO TÁC */}
          <div className="cd__actions">
            <Button
              className="cd-btn cd-btn--outline"
              icon={<DownloadOutlined />}
              onClick={handleDownloadPdf}
              loading={downloadingPdf}
            >
              Tải hợp đồng
            </Button>
            {status === "DRAFT" && (
              <Button
                className="cd-btn cd-btn--outline"
                icon={<EditOutlined />}
                onClick={handleEdit}
              >
                Chỉnh sửa
              </Button>
            )}
            {status === "ACTIVE" && (
              <>
                <Button
                  className="cd-btn cd-btn--outline"
                  icon={<CalendarOutlined />}
                  onClick={handleExtend}
                >
                  Gia hạn
                </Button>

                <Button
                  className="cd-btn cd-btn--danger"
                  danger
                  icon={<StopOutlined />}
                  onClick={handleTerminate}
                >
                  Chấm dứt
                </Button>
              </>
            )}

            {status === "DRAFT" && (
              <Button
                className="cd-btn cd-btn--danger"
                danger
                icon={<DeleteOutlined />}
                onClick={handleDelete}
                loading={deleting}
                disabled={deleting || submittingAction}
              >
                Xóa hợp đồng
              </Button>
            )}
          </div>
        </div>

        {/* THÔNG BÁO TRẠNG THÁI */}
        {status === "DRAFT" && (
          <div className="cd-banner cd-banner--draft" role="status">
            <WarningOutlined className="cd-banner__icon" />
            <div className="cd-banner__body">
              <b>Hợp đồng bản nháp</b>
              <span>
                Hợp đồng chưa đến ngày bắt đầu hoặc chưa được kích hoạt.
              </span>
            </div>
          </div>
        )}

        {status === "EXPIRED" && (
          <div className="cd-banner cd-banner--expired" role="status">
            <WarningOutlined className="cd-banner__icon" />
            <div className="cd-banner__body">
              <b>Hợp đồng đã hết hạn</b>
              <span>
                Thời hạn hợp đồng đã kết thúc. Kiểm tra ngày kết thúc và thông
                tin phòng trước khi lập hợp đồng mới.
              </span>
            </div>
          </div>
        )}

        {status === "TERMINATED" && (
          <div className="cd-banner cd-banner--terminated" role="status">
            <WarningOutlined className="cd-banner__icon" />
            <div className="cd-banner__body">
              <b>Hợp đồng đã chấm dứt</b>
              <span>
                Ngày chấm dứt thực tế: {formatDate(contract.actualEndDate)}.
              </span>
            </div>
          </div>
        )}

        <div className="cd__cols">
          {/* CỘT TRÁI */}
          <div className="cd__col cd__col--main">
            {/* NGƯỜI THUÊ */}
            <section className="cd-card" aria-label="Người thuê trong hợp đồng">
              <div className="cd-card__head">
                <h2>Người thuê trong hợp đồng</h2>

                <div className="cd-card__tools">
                  <span className="cd-count">{activeMembers.length} người</span>

                  {isActive && (
                    <Button
                      size="small"
                      className="cd-mini-btn"
                      icon={<UserAddOutlined />}
                      onClick={handleOpenAddTenant}
                    >
                      Thêm người ở cùng
                    </Button>
                  )}
                </div>
              </div>

              {sortedTenants.length > 0 ? (
                sortedTenants.map((person, index) => {
                  const fullName =
                    person.fullName ||
                    person.tenantName ||
                    (person.tenantId === contract.tenantId
                      ? contract.tenantName
                      : "Chưa có tên");

                  const phone =
                    person.phone ||
                    person.tenantPhone ||
                    (person.tenantId === contract.tenantId
                      ? contract.tenantPhone
                      : "");

                  const isPrimary =
                    person.isPrimary === true ||
                    person.primary === true ||
                    person.tenantId === contract.tenantId;

                  return (
                    <div
                      key={person.id ?? person.tenantId ?? index}
                      className={
                        isActiveMember(person)
                          ? "cd-item"
                          : "cd-item cd-item--left"
                      }
                    >
                      <span className="cd-avatar">
                        {initialsOf(fullName)}
                        {!isActiveMember(person) && (
                          <span className="cd-avatar__badge" aria-hidden="true">
                            <LogoutOutlined />
                          </span>
                        )}
                      </span>

                      <div className="cd-item__main">
                        <div className="cd-item__line">
                          <b>{fullName}</b>
                          <span
                            className={
                              isPrimary ? "cd-chip cd-chip--primary" : "cd-chip"
                            }
                          >
                            {isPrimary
                              ? "Người đứng tên hợp đồng"
                              : "Người ở cùng"}
                          </span>
                        </div>
                        <span className="cd-muted">{phone || "—"}</span>
                      </div>

                      {!isActiveMember(person) ? (
                        <span className="cd-left-tag">
                          <LogoutOutlined />
                          Đã chuyển đi · {formatDate(person.moveOutDate)}
                        </span>
                      ) : isActive && !isPrimary ? (
                        <Tooltip title="Ghi nhận người này đã chuyển đi">
                          <Button
                            className="cd-act cd-act--text"
                            icon={<LogoutOutlined />}
                            onClick={() => handleOpenMoveOut(person)}
                          >
                            Chuyển đi
                          </Button>
                        </Tooltip>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <p className="cd-empty">
                  Chưa có danh sách người thuê chi tiết.
                  {contract.tenantName
                    ? ` Người đại diện: ${contract.tenantName}.`
                    : ""}
                </p>
              )}
            </section>

            {/* DỊCH VỤ */}
            <section className="cd-card" aria-label="Dịch vụ áp dụng">
              <div className="cd-card__head">
                <h2>Dịch vụ áp dụng</h2>

                <div className="cd-card__tools">
                  <span className="cd-count">
                    {contractServices.length} dịch vụ
                  </span>

                  {isActive && (
                    <Button
                      size="small"
                      className="cd-mini-btn"
                      icon={<PlusOutlined />}
                      onClick={handleOpenAddService}
                    >
                      Thêm dịch vụ
                    </Button>
                  )}
                </div>
              </div>

              {contractServices.length > 0 ? (
                contractServices.map((service, index) => {
                  const { icon, tone } = serviceIcon(
                    service.serviceName || service.name,
                  );

                  return (
                    <div
                      key={service.id ?? service.serviceId ?? index}
                      className="cd-item"
                    >
                      <span className={`cd-svc-icon cd-svc-icon--${tone}`}>
                        {icon}
                      </span>

                      <div className="cd-item__main">
                        <b>
                          {service.serviceName || service.name || "Dịch vụ"}
                        </b>
                        <span className="cd-muted cd-muted--sm">
                          {service.billingType === "METER"
                            ? "Tính theo chỉ số"
                            : service.billingType === "MONTHLY" ||
                                service.billingType === "FIXED_MONTHLY"
                              ? "Cố định hàng tháng"
                              : service.unit
                                ? `Đơn vị tính: ${service.unit}`
                                : "Theo cấu hình dịch vụ"}
                        </span>
                      </div>

                      <b className="cd-num">
                        {money(service.unitPrice ?? service.price)}
                        {service.unit ? ` / ${service.unit}` : ""}
                      </b>

                      {isActive &&
                        (service.removable === false ? (
                          <Tooltip title="Dịch vụ bắt buộc, không thể bỏ">
                            <span
                              className="cd-act cd-act--icon cd-act--locked"
                              aria-label="Dịch vụ bắt buộc"
                            >
                              <LockOutlined />
                            </span>
                          </Tooltip>
                        ) : (
                          <Tooltip title="Bỏ dịch vụ khỏi hợp đồng">
                            <Button
                              className="cd-act cd-act--icon"
                              icon={<DeleteOutlined />}
                              aria-label="Bỏ dịch vụ khỏi hợp đồng"
                              onClick={() => handleRemoveService(service)}
                            />
                          </Tooltip>
                        ))}
                    </div>
                  );
                })
              ) : (
                <p className="cd-empty">
                  Hợp đồng chưa có dịch vụ được ghi nhận.
                </p>
              )}
            </section>

            {/* GHI CHÚ */}
            <section className="cd-card" aria-label="Ghi chú">
              <h2>Ghi chú</h2>
              <Collapsible text={contract.notes} empty="Không có ghi chú." />
            </section>
          </div>

          {/* CỘT PHẢI */}
          <div className="cd__col cd__col--side">
            {/* THANH TOÁN */}
            <section className="cd-card" aria-label="Tiền thuê và thanh toán">
              <h2>Tiền thuê và thanh toán</h2>

              <div className="cd-price">
                <span className="cd-price__label">Giá thuê hợp đồng</span>
                <span className="cd-price__value">
                  {money(contract.rentPrice)}
                  <small> / tháng</small>
                </span>
              </div>

              <dl className="cd-dl">
                <div className="cd-dl__row">
                  <dt>Tiền đặt cọc</dt>
                  <dd>{money(contract.deposit)}</dd>
                </div>
                <div className="cd-dl__row">
                  <dt>Chu kỳ thanh toán</dt>
                  <dd>
                    {PAYMENT_CYCLE_LABEL[contract.paymentCycle] ||
                      contract.paymentCycle ||
                      "—"}
                  </dd>
                </div>
                <div className="cd-dl__row">
                  <dt>Ngày đến hạn</dt>
                  <dd>
                    {contract.paymentDueDay
                      ? `Ngày ${contract.paymentDueDay} hàng tháng`
                      : "—"}
                  </dd>
                </div>
                <div className="cd-dl__row">
                  <dt>Tiền thuê + phí cố định</dt>
                  <dd>{money(fixedMonthlyTotal)}</dd>
                </div>
              </dl>

              <Text type="secondary" style={{ fontSize: 12 }}>
                Chỉ tính các dịch vụ thu phí cố định hằng tháng.
              </Text>
            </section>

            {/* THÔNG TIN PHÒNG */}
            <section className="cd-card" aria-label="Phòng và người đại diện">
              <h2>Phòng và người đại diện</h2>
              <dl className="cd-dl">
                <div className="cd-dl__row">
                  <dt>Mã phòng</dt>
                  <dd>{contract.roomNumber || "—"}</dd>
                </div>
                <div className="cd-dl__row">
                  <dt>Tòa nhà</dt>
                  <dd>{contract.buildingName || "—"}</dd>
                </div>
                <div className="cd-dl__row">
                  <dt>Người đại diện</dt>
                  <dd>{contract.tenantName || "—"}</dd>
                </div>
                <div className="cd-dl__row">
                  <dt>Số điện thoại</dt>
                  <dd>{contract.tenantPhone || "—"}</dd>
                </div>
              </dl>
            </section>

            {/* THỜI HẠN */}
            <section className="cd-card" aria-label="Thời hạn hợp đồng">
              <h2>Thời hạn hợp đồng</h2>
              <dl className="cd-dl">
                <div className="cd-dl__row">
                  <dt>Ngày bắt đầu</dt>
                  <dd>{formatDate(contract.startDate)}</dd>
                </div>
                <div className="cd-dl__row">
                  <dt>Ngày kết thúc dự kiến</dt>
                  <dd>{formatDate(contract.endDate)}</dd>
                </div>

                {ended && (
                  <div className="cd-dl__row">
                    <dt>Ngày kết thúc thực tế</dt>
                    <dd>{formatDate(contract.actualEndDate)}</dd>
                  </div>
                )}

                {status === "TERMINATED" && (
                  <div className="cd-dl__row">
                    <dt>Lý do chấm dứt</dt>
                    <dd>{contract.terminationReason || "—"}</dd>
                  </div>
                )}
              </dl>
            </section>

            {/* THÔNG TIN HỆ THỐNG */}
            <section className="cd-card" aria-label="Thông tin hệ thống">
              <h2>Thông tin hệ thống</h2>
              <dl className="cd-dl">
                <div className="cd-dl__row">
                  <dt>Mã hợp đồng</dt>
                  <dd>{contract.contractCode || "—"}</dd>
                </div>
                <div className="cd-dl__row">
                  <dt>ID hệ thống</dt>
                  <dd>#{contract.id}</dd>
                </div>
                <div className="cd-dl__row">
                  <dt>Ngày tạo</dt>
                  <dd>{formatDateTime(contract.createdAt)}</dd>
                </div>
                <div className="cd-dl__row">
                  <dt>Cập nhật lần cuối</dt>
                  <dd>{formatDateTime(contract.updatedAt)}</dd>
                </div>
              </dl>
            </section>
          </div>
        </div>
      </div>
    </Fragment>
  );
};

export default ContractDetailPage;
