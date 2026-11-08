import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Select,
  Spin,
  Tag,
} from "antd";
import {
  ArrowLeftOutlined,
  PlusOutlined,
  CalendarOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
import "./ContractForm.css";

import {
  createContract,
  updateContract,
  getContractById,
} from "../../../api/contractApi";
import { getRoomOptions } from "../../../api/roomApi";
import { getTenantOptions } from "../../../api/tenantApi";
import { getServiceOptions } from "../../../api/serviceApi";
import { path_name } from "../../../constants/path_name";
import { useNotify } from "../../../components/NotificationProvider";
// Form thêm dịch vụ có sẵn của trang Dịch vụ (đổi đường dẫn nếu khác)
import ServiceForm from "../service/ServiceForm";

const { TextArea } = Input;

const PAYMENT_CYCLES = [
  { label: "Thanh toán hàng tháng", value: "MONTHLY" },
  { label: "Thanh toán theo quý", value: "QUARTERLY" },
  { label: "Thanh toán theo năm", value: "YEARLY" },
];

const formatMoney = (value) =>
  value == null || value === "" ? "" : Number(value).toLocaleString("en-US");

const parseMoney = (value) =>
  Number(String(value || "").replace(/[^\d]/g, "")) || 0;

const getId = (item) =>
  item?.id ?? item?.roomId ?? item?.tenantId ?? item?.serviceId;

const unwrapData = (response) =>
  response?.data?.result ?? response?.data ?? response?.result ?? response;

const toList = (response) => {
  const data = unwrapData(response);

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;

  return [];
};

const normalizeBillingType = (value) =>
  String(value ?? "")
    .trim()
    .toUpperCase();

const isFixedMonthlyService = (billingType) => {
  const type = normalizeBillingType(billingType);

  return ["FIXED_MONTHLY", "MONTHLY", "FIXED"].includes(type);
};

const isDefaultService = (service) =>
  service?.defaultService === true || service?.defaultService === "true";

const uniqueIds = (ids = []) => [
  ...new Map(
    ids.filter((id) => id != null).map((id) => [String(id), id]),
  ).values(),
];

const ContractForm = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams();
  const { notify, contextHolder } = useNotify();

  const isEdit = Boolean(id);

  const [rooms, setRooms] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState({});
  const [serviceFormOpen, setServiceFormOpen] = useState(false);

  // Khi sửa hợp đồng: phòng / khách của chính hợp đồng có thể không nằm trong
  // danh sách chọn (vd. phòng không còn trống) nên giữ lại để hiện đúng tên
  const [extraRoom, setExtraRoom] = useState(null);
  const [extraTenants, setExtraTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const submittingRef = useRef(false);
  const notifyRef = useRef(notify);

  useEffect(() => {
    notifyRef.current = notify;
  }, [notify]);

  // Tải danh sách phòng, khách thuê và dịch vụ.
  useEffect(() => {
    let cancelled = false;

    const fetchOptions = async () => {
      try {
        const [roomResult, tenantResult, serviceResult] =
          await Promise.allSettled([
            getRoomOptions(),
            getTenantOptions(),
            getServiceOptions(),
          ]);

        if (cancelled) return;

        if (roomResult.status === "fulfilled") {
          setRooms(toList(roomResult.value));
        } else {
          console.error("Lỗi tải danh sách phòng:", roomResult.reason);
          setRooms([]);
        }

        if (tenantResult.status === "fulfilled") {
          setTenants(toList(tenantResult.value));
        } else {
          console.error("Lỗi tải danh sách khách thuê:", tenantResult.reason);
          setTenants([]);
        }

        if (serviceResult.status === "fulfilled") {
          setServices(toList(serviceResult.value));
        } else {
          console.error("Lỗi tải danh sách dịch vụ:", serviceResult.reason);
          setServices([]);
        }

        if (
          [roomResult, tenantResult, serviceResult].some(
            (result) => result.status === "rejected",
          )
        ) {
          notifyRef.current({
            type: "warning",
            message: "Không thể tải đầy đủ dữ liệu",
            description:
              "Một số danh sách không thể tải. Vui lòng kiểm tra API.",
          });
        }
      } catch (error) {
        console.error("Lỗi tải dữ liệu hợp đồng:", error);

        if (!cancelled) {
          notifyRef.current({
            type: "error",
            message: "Không thể tải dữ liệu",
            description: "Không thể tải dữ liệu cho hợp đồng.",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  // Chuẩn hóa dữ liệu dịch vụ từ DTO backend.
  const serviceOptions = useMemo(
    () =>
      services
        .map((service) => {
          const serviceId = getId(service);

          return {
            value: serviceId,
            label:
              service.name ?? service.serviceName ?? `Dịch vụ ${serviceId}`,
            unitPrice: Number(service.price ?? service.unitPrice ?? 0),
            unit: service.unit ?? service.unitName ?? "",
            billingType: service.billingType,
            defaultService: isDefaultService(service),
          };
        })
        .filter((service) => service.value != null),
    [services],
  );

  const defaultServiceIds = useMemo(
    () =>
      serviceOptions
        .filter((service) => service.defaultService)
        .map((service) => service.value),
    [serviceOptions],
  );

  // Khởi tạo form hoặc tải hợp đồng hiện có.
  useEffect(() => {
    let cancelled = false;

    if (!id) {
      form.setFieldsValue({
        startDate: dayjs(),
        endDate: null,
        rentPrice: undefined,
        deposit: 0,
        paymentDueDay: 5,
        paymentCycle: "MONTHLY",
        roomId: undefined,
        primaryTenantId: undefined,
        coTenantIds: [],
        serviceIds: [],
        notes: "",
      });

      setSelectedServices({});

      return () => {
        cancelled = true;
      };
    }

    const fetchContract = async () => {
      try {
        const response = await getContractById(id);

        if (cancelled) return;

        const record = unwrapData(response);

        if (!record || typeof record !== "object") {
          notifyRef.current({
            type: "error",
            message: "Không tìm thấy hợp đồng",
            description: "Không tìm thấy thông tin hợp đồng.",
          });
          return;
        }

        // Chỉ hợp đồng nháp mới được sửa. Hợp đồng đang hiệu lực dùng các
        // chức năng riêng ở trang chi tiết (gia hạn, thêm/bớt người, dịch vụ...).
        if (record.status !== "DRAFT") {
          notifyRef.current({
            type: "warning",
            message: "Không thể chỉnh sửa hợp đồng",
            description:
              "Chỉ hợp đồng bản nháp mới được chỉnh sửa. Với hợp đồng đang hiệu lực, hãy dùng các chức năng ở trang chi tiết.",
          });

          navigate(`${path_name.contract}/${id}`, { replace: true });
          return;
        }

        const contractServices =
          record.contractServices ?? record.contractItems ?? [];

        const nextSelectedServices = {};
        const serviceIds = [];

        contractServices.forEach((item) => {
          const serviceId =
            item.serviceId ??
            item.serviceItem?.id ??
            item.service?.id ??
            item.service?.serviceId;

          if (serviceId == null) return;

          if (
            !serviceIds.some(
              (existingId) => String(existingId) === String(serviceId),
            )
          ) {
            serviceIds.push(serviceId);
          }

          nextSelectedServices[serviceId] = {
            unitPrice: Number(
              item.price ??
                item.unitPrice ??
                item.serviceItem?.price ??
                item.serviceItem?.unitPrice ??
                item.service?.price ??
                item.service?.unitPrice ??
                0,
            ),
          };
        });

        const primaryTenantId =
          record.primaryTenantId ??
          record.primaryTenant?.id ??
          record.tenantId ??
          record.tenant?.id;

        const coTenantIds =
          record.coTenantIds ??
          (record.contractTenants ?? [])
            .filter((item) => {
              const tenantId = item.tenantId ?? item.tenant?.id;

              return (
                tenantId != null &&
                !item.moveOutDate &&
                String(tenantId) !== String(primaryTenantId) &&
                !item.isPrimary &&
                !item.primary
              );
            })
            .map((item) => item.tenantId ?? item.tenant?.id);

        setSelectedServices(nextSelectedServices);

        // Giữ lại phòng và khách của hợp đồng để Select hiện tên thay vì ID
        const recordRoomId =
          record.roomId ?? record.room?.id ?? record.room?.roomId;

        if (recordRoomId != null) {
          setExtraRoom({
            value: recordRoomId,
            label: `${record.roomNumber ?? `Phòng ${recordRoomId}`}${
              record.buildingName ? ` - ${record.buildingName}` : ""
            }`,
          });
        }

        const tenantExtras = [];

        if (primaryTenantId != null) {
          tenantExtras.push({
            value: primaryTenantId,
            label: record.tenantName ?? `Khách thuê ${primaryTenantId}`,
          });
        }

        (record.contractTenants ?? []).forEach((item) => {
          const tenantId = item.tenantId ?? item.tenant?.id;

          if (tenantId == null) return;

          tenantExtras.push({
            value: tenantId,
            label:
              item.fullName ??
              item.tenantName ??
              item.tenant?.fullName ??
              `Khách thuê ${tenantId}`,
          });
        });

        setExtraTenants(tenantExtras);

        form.setFieldsValue({
          roomId: record.roomId ?? record.room?.id ?? record.room?.roomId,
          primaryTenantId,
          coTenantIds,
          startDate: record.startDate ? dayjs(record.startDate) : null,
          endDate: record.endDate ? dayjs(record.endDate) : null,
          rentPrice: Number(record.rentPrice ?? 0),
          deposit: Number(record.deposit ?? 0),
          paymentDueDay: record.paymentDueDay ?? record.paymentDay ?? 5,
          paymentCycle: record.paymentCycle ?? "MONTHLY",
          serviceIds,
          notes: record.notes ?? "",
        });
      } catch (error) {
        if (!cancelled) {
          notifyRef.current({
            type: "error",
            message: "Không thể tải hợp đồng",
            description:
              error?.response?.data?.message ??
              "Không thể tải thông tin hợp đồng.",
          });
        }
      }
    };

    fetchContract();

    return () => {
      cancelled = true;
    };
  }, [id, form, navigate]);

  // Tự động thêm dịch vụ mặc định sau khi đã tải dữ liệu.
  // Không ghi đè các dịch vụ người dùng đã chọn khi tạo hoặc sửa hợp đồng.
  useEffect(() => {
    if (loading || serviceOptions.length === 0) return;

    const currentServiceIds = form.getFieldValue("serviceIds") || [];
    const mergedServiceIds = uniqueIds([
      ...defaultServiceIds,
      ...currentServiceIds,
    ]);

    const hasChanged =
      mergedServiceIds.length !== currentServiceIds.length ||
      mergedServiceIds.some(
        (serviceId, index) =>
          String(serviceId) !== String(currentServiceIds[index]),
      );

    if (hasChanged) {
      form.setFieldValue("serviceIds", mergedServiceIds);
    }

    setSelectedServices((previous) => {
      const next = { ...previous };

      mergedServiceIds.forEach((serviceId) => {
        const service = serviceOptions.find(
          (item) => String(item.value) === String(serviceId),
        );

        if (!service) return;

        next[serviceId] = {
          ...next[serviceId],
          unitPrice: next[serviceId]?.unitPrice ?? service.unitPrice ?? 0,
        };
      });

      return next;
    });
  }, [loading, serviceOptions, defaultServiceIds, form]);

  const values = Form.useWatch([], form) || {};

  const roomOptions = useMemo(
    () =>
      rooms
        .map((room) => {
          const roomId = room.id ?? room.roomId;

          return {
            value: roomId,
            label:
              room.label ||
              `${room.roomNumber ?? room.name ?? `Phòng ${roomId}`}${
                room.buildingName || room.building?.name
                  ? ` - ${room.buildingName ?? room.building?.name}`
                  : ""
              }${
                room.rentalPrice != null
                  ? ` - ${formatMoney(room.rentalPrice)}đ/tháng`
                  : ""
              }`,
          };
        })
        .filter((room) => room.value != null),
    [rooms],
  );

  // Thêm phòng của hợp đồng đang sửa nếu danh sách chưa có
  const mergedRoomOptions = useMemo(() => {
    if (
      extraRoom &&
      !roomOptions.some(
        (room) => String(room.value) === String(extraRoom.value),
      )
    ) {
      return [extraRoom, ...roomOptions];
    }

    return roomOptions;
  }, [roomOptions, extraRoom]);

  const tenantOptions = useMemo(
    () =>
      tenants
        .map((tenant) => ({
          value: getId(tenant),
          label:
            tenant.fullName ??
            tenant.tenantName ??
            tenant.name ??
            tenant.phone ??
            `Khách thuê ${getId(tenant)}`,
        }))
        .filter((tenant) => tenant.value != null),
    [tenants],
  );

  // Thêm khách của hợp đồng đang sửa nếu danh sách chưa có
  const mergedTenantOptions = useMemo(() => {
    const result = [...tenantOptions];

    extraTenants.forEach((extra) => {
      if (!result.some((item) => String(item.value) === String(extra.value))) {
        result.push(extra);
      }
    });

    return result;
  }, [tenantOptions, extraTenants]);

  const selectedRoom = rooms.find(
    (room) => String(room.id ?? room.roomId) === String(values.roomId),
  );

  const selectedServiceIds = values.serviceIds || [];

  // Chọn phòng sẽ tự điền giá thuê và tiền đặt cọc.
  const handleRoomChange = (roomId) => {
    const room = rooms.find(
      (item) => String(item.id ?? item.roomId) === String(roomId),
    );

    if (!room) return;

    const rentalPrice = Number(room.rentalPrice ?? 0);

    form.setFieldsValue({
      roomId,
      rentPrice: rentalPrice,
      deposit: rentalPrice,
    });
  };

  // Tính tổng giá các dịch vụ cố định hàng tháng.
  const monthlyServiceTotal = serviceOptions.reduce((total, service) => {
    const selected = selectedServiceIds.some(
      (serviceId) => String(serviceId) === String(service.value),
    );

    if (!selected || !isFixedMonthlyService(service.billingType)) {
      return total;
    }

    const price =
      selectedServices[service.value]?.unitPrice ?? service.unitPrice;

    return total + Number(price || 0);
  }, 0);

  const fixedMonthlyTotal = Number(values.rentPrice || 0) + monthlyServiceTotal;

  // Không cho bỏ dịch vụ mặc định, vẫn giữ đơn giá đã chỉnh sửa.
  const handleServicesChange = (serviceIds = []) => {
    const mergedServiceIds = uniqueIds([...defaultServiceIds, ...serviceIds]);

    form.setFieldValue("serviceIds", mergedServiceIds);

    setSelectedServices((previous) => {
      const next = {};

      mergedServiceIds.forEach((serviceId) => {
        const service = serviceOptions.find(
          (item) => String(item.value) === String(serviceId),
        );

        next[serviceId] = {
          unitPrice: previous[serviceId]?.unitPrice ?? service?.unitPrice ?? 0,
        };
      });

      return next;
    });
  };

  const updateServicePrice = (serviceId, price) => {
    setSelectedServices((previous) => ({
      ...previous,
      [serviceId]: {
        ...previous[serviceId],
        unitPrice: price == null ? null : Number(price),
      },
    }));
  };

  // Tải lại danh sách dịch vụ sau khi thêm mới và tự chọn dịch vụ vừa thêm
  const reloadServices = async () => {
    try {
      const previousIds = new Set(services.map((item) => String(getId(item))));
      const list = toList(await getServiceOptions());

      setServices(list);

      const added = list.filter(
        (item) => getId(item) != null && !previousIds.has(String(getId(item))),
      );

      if (added.length > 0) {
        const current = form.getFieldValue("serviceIds") || [];
        const merged = uniqueIds([...current, ...added.map(getId)]);

        form.setFieldValue("serviceIds", merged);

        setSelectedServices((previous) => {
          const next = { ...previous };

          added.forEach((item) => {
            next[getId(item)] = {
              unitPrice: Number(item.price ?? item.unitPrice ?? 0),
            };
          });

          return next;
        });
      }
    } catch (error) {
      console.error("Lỗi tải lại danh sách dịch vụ:", error);
    }
  };

  const addMonths = (months) => {
    const startDate = form.getFieldValue("startDate");

    if (!startDate) {
      notifyRef.current({
        type: "info",
        message: "Chưa chọn ngày bắt đầu",
        description: "Vui lòng chọn ngày bắt đầu trước.",
      });
      return;
    }

    form.setFieldValue(
      "endDate",
      startDate.add(months, "month").subtract(1, "day"),
    );
  };

  const handleFinish = async (formValues) => {
    if (submittingRef.current) return;

    if (!formValues.startDate || !formValues.endDate) {
      notifyRef.current({
        type: "warning",
        message: "Thiếu thời hạn hợp đồng",
        description: "Vui lòng chọn ngày bắt đầu và ngày kết thúc.",
      });
      return;
    }

    // Đảm bảo dịch vụ mặc định luôn được gửi lên backend.
    const finalServiceIds = uniqueIds([
      ...defaultServiceIds,
      ...(formValues.serviceIds || []),
    ]);

    const contractServices = finalServiceIds.map((serviceId) => {
      const service = serviceOptions.find(
        (item) => String(item.value) === String(serviceId),
      );

      return {
        serviceId: Number(serviceId),
        unitPrice: Number(
          selectedServices[serviceId]?.unitPrice ?? service?.unitPrice ?? 0,
        ),
      };
    });

    if (
      contractServices.some(
        (service) =>
          !Number.isFinite(service.unitPrice) || service.unitPrice < 0,
      )
    ) {
      notifyRef.current({
        type: "error",
        message: "Đơn giá không hợp lệ",
        description: "Vui lòng kiểm tra đơn giá của các dịch vụ.",
      });
      return;
    }

    const payload = {
      roomId: formValues.roomId,
      primaryTenantId: formValues.primaryTenantId,
      coTenantIds: formValues.coTenantIds || [],
      services: contractServices,
      startDate: formValues.startDate.format("YYYY-MM-DD"),
      endDate: formValues.endDate.format("YYYY-MM-DD"),
      rentPrice: Number(formValues.rentPrice),
      deposit: Number(formValues.deposit || 0),
      paymentDueDay: Number(formValues.paymentDueDay),
      paymentCycle: formValues.paymentCycle,
      notes: formValues.notes || "",
    };

    try {
      submittingRef.current = true;
      setSubmitting(true);

      if (isEdit) {
        await updateContract(id, payload);

        notifyRef.current({
          type: "success",
          message: "Cập nhật thành công",
          description: "Hợp đồng đã được cập nhật.",
        });
      } else {
        await createContract(payload);

        notifyRef.current({
          type: "success",
          message: "Tạo hợp đồng thành công",
          description: "Hợp đồng mới đã được lưu.",
        });
      }

      navigate(path_name.contract);
    } catch (error) {
      notifyRef.current({
        type: "error",
        message: "Không thể lưu hợp đồng",
        description:
          error?.response?.data?.message ??
          error?.response?.data?.result?.message ??
          "Đã xảy ra lỗi khi lưu hợp đồng.",
      });
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="contract-form-page">
      {contextHolder}

      <div className="contract-form-header">
        <div className="contract-form-header-left">
          <Button
            className="contract-back-button"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(path_name.contract)}
            aria-label="Quay lại"
          />

          <div>
            <h1>{isEdit ? "Cập nhật hợp đồng" : "Thêm hợp đồng"}</h1>
            <p>
              {isEdit
                ? "Cập nhật thông tin hợp đồng thuê phòng"
                : "Tạo hợp đồng thuê phòng mới"}
            </p>
          </div>

          <Button
            className="contract-create-button"
            type="primary"
            icon={<SaveOutlined />}
            loading={submitting}
            disabled={submitting || loading}
            htmlType="submit"
            form="contract-form"
          >
            {isEdit ? "Lưu thay đổi" : "Tạo hợp đồng"}
          </Button>
        </div>
      </div>

      <Spin spinning={loading} size="large">
        <Form
          id="contract-form"
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          className="contract-form"
        >
          <div className="contract-form-grid">
            <div className="contract-form-column">
              <section className="contract-form-card">
                <h2>Phòng và người thuê</h2>

                <Form.Item
                  name="roomId"
                  label="Phòng"
                  rules={[
                    {
                      required: true,
                      message: "Vui lòng chọn phòng",
                    },
                  ]}
                >
                  <Select
                    showSearch
                    optionFilterProp="label"
                    placeholder="Chọn phòng"
                    options={mergedRoomOptions}
                    onChange={handleRoomChange}
                  />
                </Form.Item>

                <div className="contract-form-hint">
                  {selectedRoom
                    ? `Giá niêm yết: ${formatMoney(
                        selectedRoom.rentalPrice,
                      )}đ / tháng.`
                    : "Chọn phòng để xem thông tin phòng."}
                </div>

                <Form.Item
                  name="primaryTenantId"
                  label="Người đứng tên hợp đồng"
                  rules={[
                    {
                      required: true,
                      message: "Vui lòng chọn người đứng tên hợp đồng",
                    },
                  ]}
                >
                  <Select
                    showSearch
                    optionFilterProp="label"
                    placeholder="Chọn khách thuê"
                    options={mergedTenantOptions}
                  />
                </Form.Item>

                <Form.Item
                  name="coTenantIds"
                  label="Người ở cùng"
                  extra="Không chọn người đứng tên. Sức chứa phòng tối đa 2 người."
                >
                  <Select
                    mode="multiple"
                    showSearch
                    optionFilterProp="label"
                    placeholder="+ Thêm người ở cùng"
                    options={mergedTenantOptions.filter(
                      (tenant) =>
                        String(tenant.value) !== String(values.primaryTenantId),
                    )}
                    maxCount={2}
                  />
                </Form.Item>
              </section>

              <section className="contract-form-card">
                <h2>Thời hạn và thanh toán</h2>

                <Form.Item
                  name="startDate"
                  label="Ngày bắt đầu"
                  rules={[
                    {
                      required: true,
                      message: "Vui lòng chọn ngày bắt đầu",
                    },
                  ]}
                >
                  <DatePicker
                    format="DD/MM/YYYY"
                    placeholder="Chọn ngày bắt đầu"
                    suffixIcon={<CalendarOutlined />}
                    style={{ width: "100%" }}
                  />
                </Form.Item>

                <Form.Item
                  name="endDate"
                  label="Ngày kết thúc"
                  dependencies={["startDate"]}
                  rules={[
                    {
                      required: true,
                      message: "Vui lòng chọn ngày kết thúc",
                    },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        const start = getFieldValue("startDate");

                        if (!value || !start || value.isAfter(start, "day")) {
                          return Promise.resolve();
                        }

                        return Promise.reject(
                          new Error("Ngày kết thúc phải sau ngày bắt đầu"),
                        );
                      },
                    }),
                  ]}
                >
                  <DatePicker
                    format="DD/MM/YYYY"
                    placeholder="Chọn ngày kết thúc"
                    suffixIcon={<CalendarOutlined />}
                    style={{ width: "100%" }}
                  />
                </Form.Item>

                <div className="contract-date-shortcuts">
                  <span>Thời hạn:</span>
                  <Button size="small" onClick={() => addMonths(6)}>
                    + 6 tháng
                  </Button>
                  <Button size="small" onClick={() => addMonths(12)}>
                    + 12 tháng
                  </Button>
                </div>

                <div className="contract-form-divider" />

                <Form.Item
                  name="rentPrice"
                  label="Giá thuê (đ / tháng)"
                  rules={[
                    {
                      required: true,
                      message: "Vui lòng nhập giá thuê",
                    },
                    {
                      type: "number",
                      min: 1,
                      message: "Giá thuê phải lớn hơn 0",
                    },
                  ]}
                >
                  <InputNumber
                    min={1}
                    precision={0}
                    formatter={formatMoney}
                    parser={parseMoney}
                    placeholder="VD: 3,200,000"
                    style={{ width: "100%" }}
                  />
                </Form.Item>

                <Form.Item
                  name="deposit"
                  label="Tiền đặt cọc (đ)"
                  rules={[
                    {
                      required: true,
                      message: "Vui lòng nhập tiền đặt cọc",
                    },
                    {
                      type: "number",
                      min: 0,
                      message: "Tiền đặt cọc không được âm",
                    },
                  ]}
                >
                  <InputNumber
                    min={0}
                    precision={0}
                    formatter={formatMoney}
                    parser={parseMoney}
                    placeholder="Nhập tiền đặt cọc"
                    style={{ width: "100%" }}
                  />
                </Form.Item>

                <Form.Item
                  name="paymentDueDay"
                  label="Ngày thanh toán trong tháng"
                  rules={[
                    {
                      required: true,
                      message: "Vui lòng chọn ngày thanh toán",
                    },
                  ]}
                >
                  <Select
                    placeholder="Chọn ngày thanh toán"
                    options={Array.from({ length: 28 }, (_, index) => ({
                      value: index + 1,
                      label: `Ngày ${index + 1} hàng tháng`,
                    }))}
                  />
                </Form.Item>

                <Form.Item
                  name="paymentCycle"
                  label="Chu kỳ thanh toán"
                  rules={[
                    {
                      required: true,
                      message: "Vui lòng chọn chu kỳ",
                    },
                  ]}
                >
                  <Select options={PAYMENT_CYCLES} />
                </Form.Item>
              </section>
            </div>

            <div className="contract-form-column">
              <section className="contract-form-card">
                <div className="contract-card-heading">
                  <div className="contract-card-title">
                    <h2>Dịch vụ áp dụng</h2>
                  </div>

                  <Button
                    className="contract-add-service-button"
                    icon={<PlusOutlined />}
                    onClick={() => setServiceFormOpen(true)}
                  >
                    Thêm dịch vụ
                  </Button>
                </div>

                <p className="contract-form-description">
                  Dịch vụ mặc định được tự động áp dụng cho hợp đồng. Các dịch
                  vụ khác có thể chọn thêm; mỗi dịch vụ có thể sử dụng đơn giá
                  riêng mà không làm thay đổi giá mặc định của danh mục.
                </p>

                <Form.Item name="serviceIds">
                  <Select
                    mode="multiple"
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    placeholder="Chọn dịch vụ cần áp dụng"
                    options={serviceOptions.map((service) => ({
                      ...service,
                      label: service.defaultService
                        ? `${service.label} (Mặc định)`
                        : service.label,
                    }))}
                    onChange={handleServicesChange}
                    tagRender={({ label, value, closable, onClose }) => {
                      const service = serviceOptions.find(
                        (item) => String(item.value) === String(value),
                      );

                      const isDefault = service?.defaultService;

                      return (
                        <Tag
                          color={isDefault ? "blue" : "default"}
                          closable={!isDefault && closable}
                          onClose={onClose}
                          style={{
                            marginInlineEnd: 4,
                            border: "none",
                            borderRadius: 10,
                          }}
                        >
                          {label}
                        </Tag>
                      );
                    }}
                  />
                </Form.Item>

                {selectedServiceIds.length > 0 ? (
                  <div className="contract-service-list">
                    {serviceOptions
                      .filter((service) =>
                        selectedServiceIds.some(
                          (serviceId) =>
                            String(serviceId) === String(service.value),
                        ),
                      )
                      .map((service) => {
                        const price =
                          selectedServices[service.value]?.unitPrice ??
                          service.unitPrice;

                        return (
                          <div
                            className="contract-service-item is-checked"
                            key={service.value}
                          >
                            <div className="contract-service-top">
                              <span className="contract-service-name">
                                {service.label}
                              </span>

                              <div className="contract-service-price">
                                <span>Đơn giá</span>

                                <InputNumber
                                  min={0}
                                  precision={0}
                                  value={price}
                                  formatter={formatMoney}
                                  parser={parseMoney}
                                  onChange={(value) =>
                                    updateServicePrice(service.value, value)
                                  }
                                  style={{ width: 150 }}
                                />
                              </div>
                            </div>

                            <div className="contract-service-unit">
                              đ / {service.unit || "đơn vị"}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="Chưa chọn dịch vụ nào."
                  />
                )}

                <div className="contract-monthly-summary">
                  <span>Tiền thuê và dịch vụ cố định mỗi tháng</span>
                  <strong>{formatMoney(fixedMonthlyTotal)}đ</strong>
                </div>
              </section>

              <section className="contract-form-card">
                <h2>Ghi chú</h2>

                <Form.Item
                  name="notes"
                  label="Ghi chú"
                  extra="Tối đa 5.000 ký tự."
                  rules={[
                    {
                      max: 5000,
                      message: "Ghi chú không được vượt quá 5.000 ký tự",
                    },
                  ]}
                >
                  <TextArea
                    rows={3}
                    maxLength={5000}
                    placeholder="Nhập ghi chú cho hợp đồng..."
                  />
                </Form.Item>
              </section>
            </div>
          </div>
        </Form>
      </Spin>

      {/* Thêm dịch vụ mới ngay trong form hợp đồng */}
      {serviceFormOpen && (
        <ServiceForm
          isMode="add"
          record={null}
          isModal={serviceFormOpen}
          hideModal={() => setServiceFormOpen(false)}
          fetchServices={reloadServices}
          onSuccess={reloadServices}
          notify={notify}
        />
      )}
    </div>
  );
};

export default ContractForm;
